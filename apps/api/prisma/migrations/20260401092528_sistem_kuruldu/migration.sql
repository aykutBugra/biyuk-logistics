-- CreateTable
CREATE TABLE "Durum" (
    "id" SERIAL NOT NULL,
    "durumTuru" VARCHAR(50) NOT NULL,
    "durumAdi" VARCHAR(100) NOT NULL,

    CONSTRAINT "Durum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "rolAd" VARCHAR(100) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KullaniciRol" (
    "id" SERIAL NOT NULL,
    "rolId" INTEGER NOT NULL,
    "kullaniciId" INTEGER NOT NULL,
    "verilmeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KullaniciRol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kullanici" (
    "id" SERIAL NOT NULL,
    "ad" VARCHAR(100) NOT NULL,
    "soyad" VARCHAR(100) NOT NULL,
    "mail" VARCHAR(100) NOT NULL,
    "kullaniciAdi" VARCHAR(100) NOT NULL,
    "sifreHash" TEXT NOT NULL,
    "telefonNumarasi" TEXT,
    "kayitTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silmeTarihi" TIMESTAMP(3),

    CONSTRAINT "Kullanici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AracKutuphanesi" (
    "id" SERIAL NOT NULL,
    "marka" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,

    CONSTRAINT "AracKutuphanesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arac" (
    "id" SERIAL NOT NULL,
    "sahipId" INTEGER NOT NULL,
    "aracKutuphaneId" INTEGER NOT NULL,
    "plaka" VARCHAR(20) NOT NULL,
    "yil" INTEGER NOT NULL,
    "kapasite" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Arac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Istek" (
    "id" SERIAL NOT NULL,
    "musteriId" INTEGER NOT NULL,
    "baslangicSehri" VARCHAR(100) NOT NULL,
    "varisSehri" VARCHAR(100) NOT NULL,
    "baslangicEnlem" DECIMAL(9,6) NOT NULL,
    "baslangicBoylam" DECIMAL(9,6) NOT NULL,
    "varisEnlem" DECIMAL(9,6) NOT NULL,
    "varisBoylam" DECIMAL(9,6) NOT NULL,
    "yukDetay" VARCHAR(500) NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durumId" INTEGER NOT NULL,

    CONSTRAINT "Istek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teklif" (
    "id" SERIAL NOT NULL,
    "istekId" INTEGER NOT NULL,
    "nakliyeciId" INTEGER NOT NULL,
    "fiyat" DECIMAL(12,2) NOT NULL,
    "not" VARCHAR(255),
    "durumId" INTEGER NOT NULL,

    CONSTRAINT "Teklif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nakliye" (
    "id" SERIAL NOT NULL,
    "istekId" INTEGER NOT NULL,
    "nakliyeciId" INTEGER NOT NULL,
    "aracId" INTEGER NOT NULL,
    "anlasilanFiyat" DECIMAL(12,2) NOT NULL,
    "baslangicTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teslimTarihi" TIMESTAMP(3),
    "durumId" INTEGER NOT NULL,

    CONSTRAINT "Nakliye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuanTanimlari" (
    "id" SERIAL NOT NULL,
    "puanDegeri" INTEGER NOT NULL,
    "etiket" VARCHAR(50) NOT NULL,
    "aciklama" VARCHAR(200),

    CONSTRAINT "PuanTanimlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puanlama" (
    "id" SERIAL NOT NULL,
    "nakliyeId" INTEGER NOT NULL,
    "puanlayanId" INTEGER NOT NULL,
    "puanlananId" INTEGER NOT NULL,
    "puanTanimId" INTEGER NOT NULL,
    "yorum" VARCHAR(500),
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puanlama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_rolAd_key" ON "Rol"("rolAd");

-- CreateIndex
CREATE UNIQUE INDEX "KullaniciRol_kullaniciId_rolId_key" ON "KullaniciRol"("kullaniciId", "rolId");

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_mail_key" ON "Kullanici"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_kullaniciAdi_key" ON "Kullanici"("kullaniciAdi");

-- CreateIndex
CREATE UNIQUE INDEX "Arac_plaka_key" ON "Arac"("plaka");

-- CreateIndex
CREATE UNIQUE INDEX "Nakliye_istekId_key" ON "Nakliye"("istekId");

-- CreateIndex
CREATE UNIQUE INDEX "PuanTanimlari_puanDegeri_key" ON "PuanTanimlari"("puanDegeri");

-- AddForeignKey
ALTER TABLE "KullaniciRol" ADD CONSTRAINT "KullaniciRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KullaniciRol" ADD CONSTRAINT "KullaniciRol_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arac" ADD CONSTRAINT "Arac_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arac" ADD CONSTRAINT "Arac_aracKutuphaneId_fkey" FOREIGN KEY ("aracKutuphaneId") REFERENCES "AracKutuphanesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Istek" ADD CONSTRAINT "Istek_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Istek" ADD CONSTRAINT "Istek_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "Durum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teklif" ADD CONSTRAINT "Teklif_istekId_fkey" FOREIGN KEY ("istekId") REFERENCES "Istek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teklif" ADD CONSTRAINT "Teklif_nakliyeciId_fkey" FOREIGN KEY ("nakliyeciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teklif" ADD CONSTRAINT "Teklif_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "Durum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nakliye" ADD CONSTRAINT "Nakliye_istekId_fkey" FOREIGN KEY ("istekId") REFERENCES "Istek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nakliye" ADD CONSTRAINT "Nakliye_nakliyeciId_fkey" FOREIGN KEY ("nakliyeciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nakliye" ADD CONSTRAINT "Nakliye_aracId_fkey" FOREIGN KEY ("aracId") REFERENCES "Arac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nakliye" ADD CONSTRAINT "Nakliye_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "Durum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puanlama" ADD CONSTRAINT "Puanlama_nakliyeId_fkey" FOREIGN KEY ("nakliyeId") REFERENCES "Nakliye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puanlama" ADD CONSTRAINT "Puanlama_puanlayanId_fkey" FOREIGN KEY ("puanlayanId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puanlama" ADD CONSTRAINT "Puanlama_puanlananId_fkey" FOREIGN KEY ("puanlananId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puanlama" ADD CONSTRAINT "Puanlama_puanTanimId_fkey" FOREIGN KEY ("puanTanimId") REFERENCES "PuanTanimlari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
