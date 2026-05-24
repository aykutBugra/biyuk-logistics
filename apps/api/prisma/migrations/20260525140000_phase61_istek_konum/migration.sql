-- Phase 6.1 Faz 3: IstekKonum child table + backfill from flat columns

CREATE TYPE "KonumYonu" AS ENUM ('BASLANGIC', 'VARIS');

CREATE TABLE "IstekKonum" (
  "id" SERIAL NOT NULL,
  "istekId" INTEGER NOT NULL,
  "yon" "KonumYonu" NOT NULL,
  "provider" VARCHAR(50),
  "placeId" VARCHAR(255),
  "konumMetni" VARCHAR(255),
  "sehir" VARCHAR(100) NOT NULL,
  "ilce" VARCHAR(100),
  "enlem" DECIMAL(9,6) NOT NULL,
  "boylam" DECIMAL(9,6) NOT NULL,

  CONSTRAINT "IstekKonum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IstekKonum_istekId_yon_key" ON "IstekKonum"("istekId", "yon");
CREATE INDEX "IstekKonum_sehir_idx" ON "IstekKonum"("sehir");

ALTER TABLE "IstekKonum"
  ADD CONSTRAINT "IstekKonum_istekId_fkey"
  FOREIGN KEY ("istekId") REFERENCES "Istek"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "IstekKonum" (
  "istekId",
  "yon",
  "provider",
  "placeId",
  "konumMetni",
  "sehir",
  "ilce",
  "enlem",
  "boylam"
)
SELECT
  i."id",
  'BASLANGIC'::"KonumYonu",
  i."baslangicProvider",
  i."baslangicPlaceId",
  i."baslangicKonumMetni",
  COALESCE(NULLIF(TRIM(i."normalizeBaslangicSehir"), ''), TRIM(i."baslangicSehri")),
  i."normalizeBaslangicIlce",
  i."baslangicEnlem",
  i."baslangicBoylam"
FROM "Istek" AS i;

INSERT INTO "IstekKonum" (
  "istekId",
  "yon",
  "provider",
  "placeId",
  "konumMetni",
  "sehir",
  "ilce",
  "enlem",
  "boylam"
)
SELECT
  i."id",
  'VARIS'::"KonumYonu",
  i."varisProvider",
  i."varisPlaceId",
  i."varisKonumMetni",
  COALESCE(NULLIF(TRIM(i."normalizeVarisSehir"), ''), TRIM(i."varisSehri")),
  i."normalizeVarisIlce",
  i."varisEnlem",
  i."varisBoylam"
FROM "Istek" AS i;
