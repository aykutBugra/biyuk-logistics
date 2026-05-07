CREATE TABLE "OfferThread" (
    "id" SERIAL NOT NULL,
    "offerId" INTEGER NOT NULL,
    "requestId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "carrierId" INTEGER NOT NULL,
    "customerLastReadMessageId" INTEGER,
    "carrierLastReadMessageId" INTEGER,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferThreadMessage" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "senderUserId" INTEGER,
    "type" VARCHAR(50) NOT NULL,
    "text" VARCHAR(2000),
    "teklifFiyati" DECIMAL(12,2),
    "systemEventCode" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferThreadMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferThread_offerId_key" ON "OfferThread"("offerId");
CREATE INDEX "OfferThread_requestId_idx" ON "OfferThread"("requestId");
CREATE INDEX "OfferThread_customerId_closedAt_idx" ON "OfferThread"("customerId", "closedAt");
CREATE INDEX "OfferThread_carrierId_closedAt_idx" ON "OfferThread"("carrierId", "closedAt");
CREATE INDEX "OfferThreadMessage_threadId_createdAt_id_idx" ON "OfferThreadMessage"("threadId", "createdAt", "id");
CREATE INDEX "OfferThreadMessage_senderUserId_idx" ON "OfferThreadMessage"("senderUserId");

ALTER TABLE "OfferThread"
    ADD CONSTRAINT "OfferThread_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Teklif"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferThread"
    ADD CONSTRAINT "OfferThread_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "Istek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferThread"
    ADD CONSTRAINT "OfferThread_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferThread"
    ADD CONSTRAINT "OfferThread_carrierId_fkey"
    FOREIGN KEY ("carrierId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferThreadMessage"
    ADD CONSTRAINT "OfferThreadMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "OfferThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferThreadMessage"
    ADD CONSTRAINT "OfferThreadMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfferThread"
    ADD CONSTRAINT "OfferThread_customerLastReadMessageId_fkey"
    FOREIGN KEY ("customerLastReadMessageId") REFERENCES "OfferThreadMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfferThread"
    ADD CONSTRAINT "OfferThread_carrierLastReadMessageId_fkey"
    FOREIGN KEY ("carrierLastReadMessageId") REFERENCES "OfferThreadMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OfferThread" ("offerId", "requestId", "customerId", "carrierId", "closedAt", "createdAt", "updatedAt")
SELECT
    t."id",
    t."istekId",
    i."musteriId",
    t."nakliyeciId",
    CASE
        WHEN UPPER(d."durumAdi") <> 'OLUSTURULDU' THEN CURRENT_TIMESTAMP
        ELSE NULL
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Teklif" t
INNER JOIN "Istek" i ON i."id" = t."istekId"
INNER JOIN "Durum" d ON d."id" = t."durumId"
LEFT JOIN "OfferThread" ot ON ot."offerId" = t."id"
WHERE ot."id" IS NULL;

INSERT INTO "OfferThreadMessage" ("threadId", "type", "teklifFiyati", "systemEventCode", "createdAt")
SELECT
    ot."id",
    'SYSTEM_EVENT',
    t."fiyat",
    'OFFER_CREATED',
    CURRENT_TIMESTAMP
FROM "OfferThread" ot
INNER JOIN "Teklif" t ON t."id" = ot."offerId"
LEFT JOIN "OfferThreadMessage" existing
    ON existing."threadId" = ot."id"
   AND existing."systemEventCode" = 'OFFER_CREATED'
WHERE existing."id" IS NULL;

UPDATE "OfferThread" ot
SET "carrierLastReadMessageId" = message_data."messageId"
FROM (
    SELECT DISTINCT ON (m."threadId")
        m."threadId",
        m."id" AS "messageId"
    FROM "OfferThreadMessage" m
    WHERE m."systemEventCode" = 'OFFER_CREATED'
    ORDER BY m."threadId", m."createdAt" ASC, m."id" ASC
) AS message_data
WHERE ot."id" = message_data."threadId"
  AND ot."carrierLastReadMessageId" IS NULL;

INSERT INTO "OfferThreadMessage" ("threadId", "type", "systemEventCode", "createdAt")
SELECT
    ot."id",
    'SYSTEM_EVENT',
    'OFFER_ACCEPTED',
    CURRENT_TIMESTAMP
FROM "OfferThread" ot
INNER JOIN "Teklif" t ON t."id" = ot."offerId"
INNER JOIN "Durum" d ON d."id" = t."durumId"
LEFT JOIN "OfferThreadMessage" existing
    ON existing."threadId" = ot."id"
   AND existing."systemEventCode" = 'OFFER_ACCEPTED'
WHERE UPPER(d."durumAdi") = 'KABUL_EDILDI'
  AND existing."id" IS NULL;

INSERT INTO "OfferThreadMessage" ("threadId", "type", "systemEventCode", "createdAt")
SELECT
    ot."id",
    'SYSTEM_EVENT',
    'OFFER_REJECTED',
    CURRENT_TIMESTAMP
FROM "OfferThread" ot
INNER JOIN "Teklif" t ON t."id" = ot."offerId"
INNER JOIN "Durum" d ON d."id" = t."durumId"
LEFT JOIN "OfferThreadMessage" existing
    ON existing."threadId" = ot."id"
   AND existing."systemEventCode" = 'OFFER_REJECTED'
WHERE UPPER(d."durumAdi") = 'REDDEDILDI'
  AND existing."id" IS NULL;
