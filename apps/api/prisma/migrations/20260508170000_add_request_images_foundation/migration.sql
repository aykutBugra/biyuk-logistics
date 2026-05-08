CREATE TABLE "IstekGorsel" (
    "id" SERIAL NOT NULL,
    "istekId" INTEGER NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "thumbnailStorageKey" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "originalFileName" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silmeTarihi" TIMESTAMP(3),

    CONSTRAINT "IstekGorsel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IstekGorsel_istekId_silmeTarihi_sortOrder_idx"
ON "IstekGorsel"("istekId", "silmeTarihi", "sortOrder");

CREATE UNIQUE INDEX "IstekGorsel_active_primary_unique"
ON "IstekGorsel"("istekId")
WHERE "isPrimary" = true AND "silmeTarihi" IS NULL;

ALTER TABLE "IstekGorsel" ADD CONSTRAINT "IstekGorsel_istekId_fkey"
FOREIGN KEY ("istekId") REFERENCES "Istek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
