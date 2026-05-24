ALTER TABLE "Nakliye"
  ADD COLUMN IF NOT EXISTS "teslimBildirimTarihi" TIMESTAMP(3);

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'NAKLIYE', 'TESLIM_BEKLIYOR'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'NAKLIYE'
    AND UPPER("durumAdi") = 'TESLIM_BEKLIYOR'
);

UPDATE "Nakliye"
SET "teslimBildirimTarihi" = COALESCE("teslimBildirimTarihi", "teslimTarihi")
WHERE "teslimTarihi" IS NOT NULL
  AND "teslimBildirimTarihi" IS NULL;

UPDATE "OfferThread" ot
SET "closedAt" = NULL
FROM "Teklif" t
INNER JOIN "Durum" td
  ON td."id" = t."durumId"
INNER JOIN "Nakliye" n
  ON n."istekId" = t."istekId"
INNER JOIN "Durum" nd
  ON nd."id" = n."durumId"
WHERE ot."offerId" = t."id"
  AND ot."closedAt" IS NOT NULL
  AND UPPER(td."durumTuru") = 'TEKLIF'
  AND UPPER(td."durumAdi") = 'KABUL_EDILDI'
  AND UPPER(nd."durumTuru") = 'NAKLIYE'
  AND UPPER(nd."durumAdi") <> 'TAMAMLANDI';
