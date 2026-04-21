ALTER TABLE "Arac"
ADD COLUMN "maksimumAgirlikKg" DECIMAL(10,2),
ADD COLUMN "maksimumHacimM3" DECIMAL(10,2),
ADD COLUMN "kasaTipi" VARCHAR(50) NOT NULL DEFAULT 'DIGER',
ADD COLUMN "uzunlukCm" INTEGER,
ADD COLUMN "genislikCm" INTEGER,
ADD COLUMN "yukseklikCm" INTEGER;

UPDATE "Arac"
SET "maksimumAgirlikKg" = ROUND(("kapasite" * 1000)::numeric, 2)
WHERE "maksimumAgirlikKg" IS NULL;

ALTER TABLE "Arac"
ALTER COLUMN "maksimumAgirlikKg" SET NOT NULL;

ALTER TABLE "Arac"
DROP COLUMN "kapasite";

ALTER TABLE "Istek"
ADD COLUMN "baslangicKonumMetni" VARCHAR(255),
ADD COLUMN "varisKonumMetni" VARCHAR(255),
ADD COLUMN "baslangicProvider" VARCHAR(50),
ADD COLUMN "varisProvider" VARCHAR(50),
ADD COLUMN "baslangicPlaceId" VARCHAR(255),
ADD COLUMN "varisPlaceId" VARCHAR(255),
ADD COLUMN "normalizeBaslangicSehir" VARCHAR(100),
ADD COLUMN "normalizeVarisSehir" VARCHAR(100),
ADD COLUMN "normalizeBaslangicIlce" VARCHAR(100),
ADD COLUMN "normalizeVarisIlce" VARCHAR(100),
ADD COLUMN "tekTasimaIstiyor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "agirlikKg" DECIMAL(10,2),
ADD COLUMN "hacimM3" DECIMAL(10,2),
ADD COLUMN "yukTipi" VARCHAR(50) NOT NULL DEFAULT 'GENEL',
ADD COLUMN "tasimaTarihi" VARCHAR(10);

UPDATE "Istek"
SET
  "baslangicKonumMetni" = COALESCE("baslangicKonumMetni", "baslangicSehri"),
  "varisKonumMetni" = COALESCE("varisKonumMetni", "varisSehri"),
  "normalizeBaslangicSehir" = COALESCE("normalizeBaslangicSehir", "baslangicSehri"),
  "normalizeVarisSehir" = COALESCE("normalizeVarisSehir", "varisSehri");

CREATE INDEX "Istek_normalizeBaslangicSehir_idx"
ON "Istek"("normalizeBaslangicSehir");

CREATE INDEX "Istek_normalizeVarisSehir_idx"
ON "Istek"("normalizeVarisSehir");

CREATE INDEX "Istek_tasimaTarihi_idx"
ON "Istek"("tasimaTarihi");
