-- DropForeignKey
ALTER TABLE "Teklif" DROP CONSTRAINT "Teklif_aracId_fkey";

-- AlterTable
ALTER TABLE "Nakliye" ADD COLUMN     "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "baslangicTarihi" DROP NOT NULL,
ALTER COLUMN "baslangicTarihi" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Teklif" ADD CONSTRAINT "Teklif_aracId_fkey" FOREIGN KEY ("aracId") REFERENCES "Arac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'NAKLIYE', 'OLUSTURULDU'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'NAKLIYE'
    AND UPPER("durumAdi") = 'OLUSTURULDU'
);

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'NAKLIYE', 'TAMAMLANDI'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'NAKLIYE'
    AND UPPER("durumAdi") = 'TAMAMLANDI'
);

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'ISTEK', 'TAMAMLANDI'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'ISTEK'
    AND UPPER("durumAdi") = 'TAMAMLANDI'
);

UPDATE "Nakliye" AS "nakliye"
SET
  "olusturmaTarihi" = COALESCE("nakliye"."baslangicTarihi", "nakliye"."olusturmaTarihi"),
  "baslangicTarihi" = NULL,
  "durumId" = "olusturulduDurum"."id"
FROM "Durum" AS "olusturulduDurum"
INNER JOIN "Durum" AS "baslatildiDurum"
  ON UPPER("baslatildiDurum"."durumTuru") = 'NAKLIYE'
 AND UPPER("baslatildiDurum"."durumAdi") = 'BASLATILDI'
WHERE UPPER("olusturulduDurum"."durumTuru") = 'NAKLIYE'
  AND UPPER("olusturulduDurum"."durumAdi") = 'OLUSTURULDU'
  AND "nakliye"."durumId" = "baslatildiDurum"."id"
  AND "nakliye"."teslimTarihi" IS NULL;
