-- DropIndex
DROP INDEX "Arac_plaka_key";

-- AlterTable
ALTER TABLE "Arac" ADD COLUMN     "silmeTarihi" TIMESTAMP(3);

CREATE UNIQUE INDEX "Arac_plaka_active_unique"
ON "Arac" ("plaka")
WHERE "silmeTarihi" IS NULL;



-- AlterTable
ALTER TABLE "Istek" ADD COLUMN     "silmeTarihi" TIMESTAMP(3);


