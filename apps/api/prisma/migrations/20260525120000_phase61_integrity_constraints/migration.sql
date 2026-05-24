-- Phase 6.1 Faz 1: duplicate merge + natural key unique constraints

-- Normalize Durum casing for stable lookups
UPDATE "Durum"
SET "durumTuru" = UPPER(TRIM("durumTuru")),
    "durumAdi" = UPPER(TRIM("durumAdi"));

-- Merge duplicate Durum rows (case-insensitive)
WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER("durumTuru"), UPPER("durumAdi")
    ) AS keep_id
  FROM "Durum"
)
UPDATE "Istek" AS target
SET "durumId" = ranked.keep_id
FROM ranked
WHERE target."durumId" = ranked.id
  AND ranked.id <> ranked.keep_id;

WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER("durumTuru"), UPPER("durumAdi")
    ) AS keep_id
  FROM "Durum"
)
UPDATE "Teklif" AS target
SET "durumId" = ranked.keep_id
FROM ranked
WHERE target."durumId" = ranked.id
  AND ranked.id <> ranked.keep_id;

WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER("durumTuru"), UPPER("durumAdi")
    ) AS keep_id
  FROM "Durum"
)
UPDATE "Nakliye" AS target
SET "durumId" = ranked.keep_id
FROM ranked
WHERE target."durumId" = ranked.id
  AND ranked.id <> ranked.keep_id;

WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER("durumTuru"), UPPER("durumAdi")
    ) AS keep_id
  FROM "Durum"
)
DELETE FROM "Durum" AS target
USING ranked
WHERE target.id = ranked.id
  AND ranked.id <> ranked.keep_id;

CREATE UNIQUE INDEX "Durum_durumTuru_durumAdi_key"
  ON "Durum"("durumTuru", "durumAdi");

-- Merge duplicate AracKutuphanesi rows
WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER(TRIM("marka")), UPPER(TRIM("model"))
    ) AS keep_id
  FROM "AracKutuphanesi"
)
UPDATE "Arac" AS target
SET "aracKutuphaneId" = ranked.keep_id
FROM ranked
WHERE target."aracKutuphaneId" = ranked.id
  AND ranked.id <> ranked.keep_id;

WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER(TRIM("marka")), UPPER(TRIM("model"))
    ) AS keep_id
  FROM "AracKutuphanesi"
)
DELETE FROM "AracKutuphanesi" AS target
USING ranked
WHERE target.id = ranked.id
  AND ranked.id <> ranked.keep_id;

CREATE UNIQUE INDEX "AracKutuphanesi_marka_model_key"
  ON "AracKutuphanesi"("marka", "model");

-- Merge duplicate PuanTanimlari rows
WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER(TRIM("puanlamaTuru"))
    ) AS keep_id
  FROM "PuanTanimlari"
)
UPDATE "Puanlama" AS target
SET "puanTanimId" = ranked.keep_id
FROM ranked
WHERE target."puanTanimId" = ranked.id
  AND ranked.id <> ranked.keep_id;

WITH ranked AS (
  SELECT
    id,
    MIN(id) OVER (
      PARTITION BY UPPER(TRIM("puanlamaTuru"))
    ) AS keep_id
  FROM "PuanTanimlari"
)
DELETE FROM "PuanTanimlari" AS target
USING ranked
WHERE target.id = ranked.id
  AND ranked.id <> ranked.keep_id;

CREATE UNIQUE INDEX "PuanTanimlari_puanlamaTuru_key"
  ON "PuanTanimlari"("puanlamaTuru");

-- Document partial unique indexes already present in DB (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Arac_plaka_active_unique"
  ON "Arac"("plaka")
  WHERE "silmeTarihi" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "IstekGorsel_active_primary_unique"
  ON "IstekGorsel"("istekId")
  WHERE "isPrimary" = true AND "silmeTarihi" IS NULL;
