CREATE UNIQUE INDEX "Puanlama_nakliyeId_puanlayanId_puanlananId_key"
ON "Puanlama"("nakliyeId", "puanlayanId", "puanlananId");

CREATE INDEX "Puanlama_nakliyeId_idx"
ON "Puanlama"("nakliyeId");

CREATE INDEX "Puanlama_puanlayanId_idx"
ON "Puanlama"("puanlayanId");

CREATE INDEX "Puanlama_puanlananId_idx"
ON "Puanlama"("puanlananId");

INSERT INTO "PuanTanimlari" ("puanlamaTuru", "aciklama")
SELECT 'SAYISAL_1_5', 'Tamamlanan nakliye icin 1 ile 5 arasinda sayisal rating semasi'
WHERE NOT EXISTS (
  SELECT 1
  FROM "PuanTanimlari"
  WHERE UPPER("puanlamaTuru") = 'SAYISAL_1_5'
);
