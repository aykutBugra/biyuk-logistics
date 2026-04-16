INSERT INTO "Durum" ("durumTuru", "durumAdi")
SELECT 'ISTEK', 'OLUSTURULDU'
WHERE NOT EXISTS (
    SELECT 1
    FROM "Durum"
    WHERE "durumTuru" = 'ISTEK'
      AND "durumAdi" = 'OLUSTURULDU'
);
