-- DropIndex
DROP INDEX IF EXISTS "Istek_normalizeBaslangicSehir_idx";

-- DropIndex
DROP INDEX IF EXISTS "Istek_normalizeVarisSehir_idx";

-- DropIndex
DROP INDEX IF EXISTS "Istek_tasimaTarihi_idx";

-- AlterTable safely: Arac.maksimumHacimM3
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Arac'
      AND column_name = 'maksimumHacimM3'
  ) THEN
    ALTER TABLE "Arac"
    ALTER COLUMN "maksimumHacimM3" SET DATA TYPE DECIMAL(65,30);
  END IF;
END $$;

-- AlterTable safely: Istek.agirlikKg / Istek.hacimM3
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Istek'
      AND column_name = 'agirlikKg'
  ) THEN
    ALTER TABLE "Istek"
    ALTER COLUMN "agirlikKg" SET DATA TYPE DECIMAL(65,30);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Istek'
      AND column_name = 'hacimM3'
  ) THEN
    ALTER TABLE "Istek"
    ALTER COLUMN "hacimM3" SET DATA TYPE DECIMAL(65,30);
  END IF;
END $$;