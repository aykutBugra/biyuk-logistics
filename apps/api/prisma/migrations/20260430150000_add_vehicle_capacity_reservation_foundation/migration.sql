CREATE TABLE "VehicleCapacityReservation" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "requestId" INTEGER NOT NULL,
    "offerId" INTEGER NOT NULL,
    "reservedAgirlikKg" DECIMAL(10,2),
    "reservedHacimM3" DECIMAL(10,2),
    "isDedicated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" VARCHAR(50),

    CONSTRAINT "VehicleCapacityReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleCapacityReservation_shipmentId_idx"
    ON "VehicleCapacityReservation"("shipmentId");

CREATE INDEX "VehicleCapacityReservation_vehicleId_releasedAt_idx"
    ON "VehicleCapacityReservation"("vehicleId", "releasedAt");

CREATE UNIQUE INDEX "VehicleCapacityReservation_active_shipment_key"
    ON "VehicleCapacityReservation"("shipmentId")
    WHERE "releasedAt" IS NULL;

ALTER TABLE "VehicleCapacityReservation"
    ADD CONSTRAINT "VehicleCapacityReservation_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Arac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleCapacityReservation"
    ADD CONSTRAINT "VehicleCapacityReservation_shipmentId_fkey"
    FOREIGN KEY ("shipmentId") REFERENCES "Nakliye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleCapacityReservation"
    ADD CONSTRAINT "VehicleCapacityReservation_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "Istek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleCapacityReservation"
    ADD CONSTRAINT "VehicleCapacityReservation_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Teklif"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "VehicleCapacityReservation" (
    "vehicleId",
    "shipmentId",
    "requestId",
    "offerId",
    "reservedAgirlikKg",
    "reservedHacimM3",
    "isDedicated",
    "createdAt"
)
SELECT
    n."aracId",
    n."id",
    n."istekId",
    t."id",
    i."agirlikKg",
    i."hacimM3",
    i."tekTasimaIstiyor",
    n."olusturmaTarihi"
FROM "Nakliye" n
INNER JOIN "Durum" nd
    ON nd."id" = n."durumId"
INNER JOIN "Istek" i
    ON i."id" = n."istekId"
INNER JOIN "Teklif" t
    ON t."istekId" = n."istekId"
   AND t."nakliyeciId" = n."nakliyeciId"
INNER JOIN "Durum" td
    ON td."id" = t."durumId"
LEFT JOIN "VehicleCapacityReservation" existing
    ON existing."shipmentId" = n."id"
   AND existing."releasedAt" IS NULL
WHERE UPPER(nd."durumTuru") = 'NAKLIYE'
  AND UPPER(nd."durumAdi") <> 'TAMAMLANDI'
  AND UPPER(td."durumTuru") = 'TEKLIF'
  AND UPPER(td."durumAdi") = 'KABUL_EDILDI'
  AND existing."id" IS NULL;
