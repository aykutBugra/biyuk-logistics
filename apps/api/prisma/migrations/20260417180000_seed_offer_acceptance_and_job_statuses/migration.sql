INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'TEKLIF', 'KABUL_EDILDI'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'TEKLIF'
    AND UPPER("durumAdi") = 'KABUL_EDILDI'
);

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'TEKLIF', 'REDDEDILDI'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'TEKLIF'
    AND UPPER("durumAdi") = 'REDDEDILDI'
);

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'ISTEK', 'ANLASILDI'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'ISTEK'
    AND UPPER("durumAdi") = 'ANLASILDI'
);

INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'NAKLIYE', 'BASLATILDI'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Durum"
  WHERE UPPER("durumTuru") = 'NAKLIYE'
    AND UPPER("durumAdi") = 'BASLATILDI'
);
