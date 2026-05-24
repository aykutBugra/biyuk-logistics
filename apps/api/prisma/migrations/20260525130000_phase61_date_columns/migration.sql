-- Phase 6.1 Faz 2: canonical city fields + parallel date columns

-- Canonicalize duplicate city columns on Istek
UPDATE "Istek"
SET
  "normalizeBaslangicSehir" = COALESCE(
    NULLIF(TRIM("normalizeBaslangicSehir"), ''),
    NULLIF(TRIM("baslangicSehri"), '')
  ),
  "normalizeVarisSehir" = COALESCE(
    NULLIF(TRIM("normalizeVarisSehir"), ''),
    NULLIF(TRIM("varisSehri"), '')
  );

UPDATE "Istek"
SET
  "baslangicSehri" = COALESCE("normalizeBaslangicSehir", "baslangicSehri"),
  "varisSehri" = COALESCE("normalizeVarisSehir", "varisSehri"),
  "normalizeBaslangicSehir" = COALESCE("normalizeBaslangicSehir", "baslangicSehri"),
  "normalizeVarisSehir" = COALESCE("normalizeVarisSehir", "varisSehri");

-- Canonicalize city columns on CarrierRoute
UPDATE "CarrierRoute"
SET
  "normalizeBaslangicSehir" = COALESCE(
    NULLIF(TRIM("normalizeBaslangicSehir"), ''),
    NULLIF(TRIM("baslangicSehri"), '')
  ),
  "normalizeVarisSehir" = COALESCE(
    NULLIF(TRIM("normalizeVarisSehir"), ''),
    NULLIF(TRIM("varisSehri"), '')
  );

UPDATE "CarrierRoute"
SET
  "baslangicSehri" = COALESCE("normalizeBaslangicSehir", "baslangicSehri"),
  "varisSehri" = COALESCE("normalizeVarisSehir", "varisSehri"),
  "normalizeBaslangicSehir" = COALESCE("normalizeBaslangicSehir", "baslangicSehri"),
  "normalizeVarisSehir" = COALESCE("normalizeVarisSehir", "varisSehri");

ALTER TABLE "Istek"
  ADD COLUMN "tasimaTarihiGun" DATE;

ALTER TABLE "CarrierRoute"
  ADD COLUMN "planlananTarihGun" DATE;

UPDATE "Istek"
SET "tasimaTarihiGun" = CASE
  WHEN "tasimaTarihi" IS NULL OR TRIM("tasimaTarihi") = '' THEN NULL
  WHEN "tasimaTarihi" ~ '^\d{4}-\d{2}-\d{2}$' THEN "tasimaTarihi"::date
  ELSE NULL
END;

UPDATE "CarrierRoute"
SET "planlananTarihGun" = CASE
  WHEN TRIM("planlananTarih") = '' THEN NULL
  WHEN "planlananTarih" ~ '^\d{4}-\d{2}-\d{2}$' THEN "planlananTarih"::date
  ELSE NULL
END;

CREATE INDEX "Istek_tasimaTarihiGun_idx" ON "Istek"("tasimaTarihiGun");
CREATE INDEX "CarrierRoute_planlananTarihGun_idx" ON "CarrierRoute"("planlananTarihGun");
