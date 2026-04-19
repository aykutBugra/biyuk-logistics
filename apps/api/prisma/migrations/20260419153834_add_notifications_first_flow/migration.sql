-- CreateTable
CREATE TABLE "Bildirim" (
    "id" SERIAL NOT NULL,
    "kullaniciId" INTEGER NOT NULL,
    "tip" VARCHAR(100) NOT NULL,
    "baslik" VARCHAR(150) NOT NULL,
    "mesaj" VARCHAR(300) NOT NULL,
    "hedefUrl" VARCHAR(255),
    "olayAnahtari" VARCHAR(200),
    "okunmaTarihi" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bildirim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bildirim_olayAnahtari_key" ON "Bildirim"("olayAnahtari");

-- CreateIndex
CREATE INDEX "Bildirim_kullaniciId_okunmaTarihi_olusturmaTarihi_idx" ON "Bildirim"("kullaniciId", "okunmaTarihi", "olusturmaTarihi");

-- AddForeignKey
ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
