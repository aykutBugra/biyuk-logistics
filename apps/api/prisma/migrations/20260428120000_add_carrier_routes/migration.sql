CREATE TABLE "CarrierRoute" (
    "id" SERIAL NOT NULL,
    "nakliyeciId" INTEGER NOT NULL,
    "baslangicSehri" VARCHAR(100) NOT NULL,
    "varisSehri" VARCHAR(100) NOT NULL,
    "baslangicKonumMetni" VARCHAR(255),
    "varisKonumMetni" VARCHAR(255),
    "baslangicProvider" VARCHAR(50),
    "varisProvider" VARCHAR(50),
    "baslangicPlaceId" VARCHAR(255),
    "varisPlaceId" VARCHAR(255),
    "normalizeBaslangicSehir" VARCHAR(100),
    "normalizeVarisSehir" VARCHAR(100),
    "normalizeBaslangicIlce" VARCHAR(100),
    "normalizeVarisIlce" VARCHAR(100),
    "baslangicEnlem" DECIMAL(9,6) NOT NULL,
    "baslangicBoylam" DECIMAL(9,6) NOT NULL,
    "varisEnlem" DECIMAL(9,6) NOT NULL,
    "varisBoylam" DECIMAL(9,6) NOT NULL,
    "rotaMesafeMetre" INTEGER,
    "rotaSureSaniye" INTEGER,
    "planlananTarih" VARCHAR(10) NOT NULL,
    "maksimumSapmaKm" DECIMAL(10,2),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,
    "silmeTarihi" TIMESTAMP(3),

    CONSTRAINT "CarrierRoute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarrierRoute_nakliyeciId_silmeTarihi_idx"
ON "CarrierRoute"("nakliyeciId", "silmeTarihi");

CREATE INDEX "CarrierRoute_planlananTarih_idx"
ON "CarrierRoute"("planlananTarih");

CREATE INDEX "CarrierRoute_normalizeBaslangicSehir_idx"
ON "CarrierRoute"("normalizeBaslangicSehir");

CREATE INDEX "CarrierRoute_normalizeVarisSehir_idx"
ON "CarrierRoute"("normalizeVarisSehir");

ALTER TABLE "CarrierRoute" ADD CONSTRAINT "CarrierRoute_nakliyeciId_fkey"
FOREIGN KEY ("nakliyeciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
