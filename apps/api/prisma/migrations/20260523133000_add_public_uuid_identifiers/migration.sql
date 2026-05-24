CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Kullanici" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "Arac" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "CarrierRoute" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "Istek" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "IstekGorsel" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "Teklif" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "OfferThread" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "OfferThreadMessage" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "OfferThreadMessageAttachment" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "Nakliye" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "Puanlama" ADD COLUMN IF NOT EXISTS "publicId" UUID;
ALTER TABLE "Bildirim" ADD COLUMN IF NOT EXISTS "publicId" UUID;

UPDATE "Kullanici" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "Arac" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "CarrierRoute" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "Istek" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "IstekGorsel" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "Teklif" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "OfferThread" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "OfferThreadMessage" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "OfferThreadMessageAttachment" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "Nakliye" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "Puanlama" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "Bildirim" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;

ALTER TABLE "Kullanici" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "Arac" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "CarrierRoute" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "Istek" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "IstekGorsel" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "Teklif" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "OfferThread" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "OfferThreadMessage" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "OfferThreadMessageAttachment" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "Nakliye" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "Puanlama" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
ALTER TABLE "Bildirim" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();

ALTER TABLE "Kullanici" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Arac" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "CarrierRoute" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Istek" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "IstekGorsel" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Teklif" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "OfferThread" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "OfferThreadMessage" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "OfferThreadMessageAttachment" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Nakliye" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Puanlama" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Bildirim" ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Kullanici_publicId_key" ON "Kullanici"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Arac_publicId_key" ON "Arac"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "CarrierRoute_publicId_key" ON "CarrierRoute"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Istek_publicId_key" ON "Istek"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "IstekGorsel_publicId_key" ON "IstekGorsel"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Teklif_publicId_key" ON "Teklif"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "OfferThread_publicId_key" ON "OfferThread"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "OfferThreadMessage_publicId_key" ON "OfferThreadMessage"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "OfferThreadMessageAttachment_publicId_key" ON "OfferThreadMessageAttachment"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Nakliye_publicId_key" ON "Nakliye"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Puanlama_publicId_key" ON "Puanlama"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bildirim_publicId_key" ON "Bildirim"("publicId");

UPDATE "Bildirim" b
SET "hedefUrl" = '/dashboard/isteklerim/' || i."publicId"::text
FROM "Istek" i
WHERE b."hedefUrl" = '/dashboard/isteklerim/' || i."id"::text;

UPDATE "Bildirim" b
SET "hedefUrl" = '/dashboard/acik_istekler/' || i."publicId"::text
FROM "Istek" i
WHERE b."hedefUrl" = '/dashboard/acik_istekler/' || i."id"::text;

UPDATE "Bildirim" b
SET "hedefUrl" = '/dashboard/nakliyelerim/' || n."publicId"::text
FROM "Nakliye" n
WHERE b."hedefUrl" = '/dashboard/nakliyelerim/' || n."id"::text;

UPDATE "Bildirim" b
SET "hedefUrl" = '/dashboard/konusmalar/teklif/' || t."publicId"::text
FROM "Teklif" t
WHERE b."hedefUrl" = '/dashboard/konusmalar/teklif/' || t."id"::text;
