/*
  Warnings:

  - You are about to drop the column `aktifMi` on the `PuanTanimlari` table. All the data in the column will be lost.
  - You are about to drop the column `etiket` on the `PuanTanimlari` table. All the data in the column will be lost.
  - You are about to drop the column `puanDegeri` on the `PuanTanimlari` table. All the data in the column will be lost.
  - Added the required column `puanlamaTuru` to the `PuanTanimlari` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puanDegeri` to the `Puanlama` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PuanTanimlari_puanDegeri_key";

-- AlterTable
ALTER TABLE "PuanTanimlari" DROP COLUMN "aktifMi",
DROP COLUMN "etiket",
DROP COLUMN "puanDegeri",
ADD COLUMN     "aciklama" VARCHAR(200),
ADD COLUMN     "puanlamaTuru" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "Puanlama" ADD COLUMN     "puanDegeri" INTEGER NOT NULL;
