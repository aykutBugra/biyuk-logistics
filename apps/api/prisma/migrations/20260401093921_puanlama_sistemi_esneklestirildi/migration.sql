/*
  Warnings:

  - You are about to drop the column `aciklama` on the `PuanTanimlari` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PuanTanimlari" DROP COLUMN "aciklama",
ADD COLUMN     "aktifMi" BOOLEAN NOT NULL DEFAULT true;
