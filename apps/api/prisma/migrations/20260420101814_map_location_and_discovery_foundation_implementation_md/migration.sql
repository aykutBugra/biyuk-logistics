-- DropIndex
DROP INDEX "Istek_normalizeBaslangicSehir_idx";

-- DropIndex
DROP INDEX "Istek_normalizeVarisSehir_idx";

-- DropIndex
DROP INDEX "Istek_tasimaTarihi_idx";

-- AlterTable
ALTER TABLE "Arac" ALTER COLUMN "maksimumHacimM3" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Istek" ALTER COLUMN "agirlikKg" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "hacimM3" SET DATA TYPE DECIMAL(65,30);
