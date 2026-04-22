-- DropIndex
DROP INDEX "Arac_plaka_key";

-- AlterTable
ALTER TABLE "Arac" ADD COLUMN     "silmeTarihi" TIMESTAMP(3);

CREATE UNIQUE INDEX "Arac_plaka_active_unique"
ON "Arac" ("plaka")
WHERE "silmeTarihi" IS NULL;

--plaka aktif kayıtlar arasında unique olacak şekilde bir index oluşturulur. 
--Böylece silinmiş kayıtlar arasında aynı plakaya sahip araçlar olabilir, ancak
-- aktif kayıtlar arasında aynı plakaya sahip araçlar olamaz.


-- AlterTable
ALTER TABLE "Istek" ADD COLUMN     "silmeTarihi" TIMESTAMP(3);


