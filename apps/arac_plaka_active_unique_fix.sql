DROP INDEX IF EXISTS "Arac_plaka_key";
DROP INDEX IF EXISTS "Arac_plaka_active_unique";

CREATE UNIQUE INDEX "Arac_plaka_active_unique"
ON "Arac" ("plaka")
WHERE "silmeTarihi" IS NULL;
