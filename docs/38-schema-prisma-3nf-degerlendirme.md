# Amac

Bu dokuman, `apps/api/prisma/schema.prisma` dosyasindaki mevcut veri modelini:

1. `1NF`, `2NF`, `3NF` acisindan degerlendirir
2. Gercek normalizasyon problemi ile bilincli denormalization'i ayirir
3. Repo gercegine gore hangi duzenlemenin mantikli oldugunu soyler
4. 3NF'e daha yakin bir hedef sema onerir

Ana kaynak dosya:

- `apps/api/prisma/schema.prisma`

Davranis referanslari:

- `apps/api/src/modules/transport-requests/transport-requests.service.ts`
- `apps/api/src/modules/offers/repositories/offers.repository.ts`
- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`
- `apps/api/src/modules/ratings/ratings.service.ts`
- `apps/api/src/modules/notifications/notifications.publisher.ts`

---

# Kisa Sonuc

Mevcut sema tamamen kotu degil. Hatta cogu tablo pratikte duzgun.

Benim net gorusum:

- `1NF`: buyuk olcude saglaniyor
- `2NF`: neredeyse tum semada saglaniyor
- `3NF`: buyuk resimde fena degil ama en ciddi baski `Istek` tablosunda

En kritik noktalar:

1. `Istek` tablosu location snapshot, filtreleme verisi ve legacy fallback alanlarini ayni tabloda biriktiriyor
2. `Durum` tablosu fazla generic kullaniliyor
3. Bazi lookup tablolarda dogal anahtar `unique` degil
4. `tasimaTarihi` string tutuluyor

Ben olsam sifirdan her seyi parcalamazdim. Ama 3NF'e daha temiz yaklasmak icin su duzenlemeleri yapardim:

1. `Istek` icin ayri `IstekKonum` snapshot tablosu
2. `Durum` icin en az `@@unique([durumTuru, durumAdi])`, idealde domain bazli enum veya lookup
3. `AracKutuphanesi` icin `@@unique([marka, model])`
4. `PuanTanimlari.puanlamaTuru` icin `@unique`
5. `tasimaTarihi` icin `Date` tabanli alan

---

# Normalizasyon Kisa Hatirlatma

## 1NF

Bir tabloda:

- kolonlar atomic olmali
- bir hucrede birden fazla deger mantigi olmamali
- tekrar eden grup mantigi minimum olmali

## 2NF

- tablo 1NF olmali
- non-key alanlar key'in sadece bir parcasina degil, tamamina bagli olmali

Bu repo icin onemli not:

- cogu tabloda `id` tabanli tekil primary key var
- bu yuzden 2NF zaten buyuk oranda otomatik saglaniyor

## 3NF

- tablo 2NF olmali
- non-key kolonlar baska non-key kolonlara bagimli olmamali
- yani transitive dependency minimum olmali

Pratikte:

- bir tabloya ayni gercegin farkli kopyalarini koyarsan
- ya da bir non-key alandan tureyen baska non-key alanlar biriktirirsen
- 3NF baskilanir

---

# Model Bazli Degerlendirme

## 1. `Durum`

### Mevcut durum

```prisma
model Durum {
  id         Int      @id @default(autoincrement())
  durumTuru  String   @db.VarChar(50)
  durumAdi   String   @db.VarChar(100)

  istekler   Istek[]
  teklifler  Teklif[]
  nakliyeler Nakliye[]
}
```

### Yorum

Bu tablo yapisal olarak kabul edilebilir. Ama domain olarak fazla generic.

Repo kullanimi sunu gosteriyor:

- `transport-requests.service.ts` sabit stringlerle `ISTEK/OLUSTURULDU` ariyor
- `offers.service.ts` sabit stringlerle `TEKLIF/KABUL_EDILDI`, `ISTEK/ANLASILDI` ariyor
- `jobs.service.ts` sabit stringlerle `NAKLIYE/BASLATILDI`, `NAKLIYE/TAMAMLANDI` ariyor

Yani uygulama aslinda generic `Durum` kullanmiyor. Uygulama fiilen:

- `IstekDurumu`
- `TeklifDurumu`
- `NakliyeDurumu`

gibi ayri domain state'lerle calisiyor.

### 3NF notu

`Durum` tablosu kendi basina 3NF disi degil. Ama veri butunlugu acigi var:

- `schema.prisma` icinde `@@unique([durumTuru, durumAdi])` yok
- bu da ayni durumun teorik olarak birden fazla kez yazilabilmesi demek
- repo tarafinda da `findFirst(...)` ile araniyor, `findUnique(...)` degil

### Oneri

Minimum:

```prisma
model Durum {
  id         Int      @id @default(autoincrement())
  durumTuru  String   @db.VarChar(50)
  durumAdi   String   @db.VarChar(100)

  istekler   Istek[]
  teklifler  Teklif[]
  nakliyeler Nakliye[]

  @@unique([durumTuru, durumAdi])
}
```

Ideal:

- `Istek`, `Teklif`, `Nakliye` icin ayri enum ya da ayri lookup tablolar

---

## 2. `Rol`, `KullaniciRol`, `Kullanici`

### Mevcut durum

Bu bolum genel olarak duzgun.

- `Rol.rolAd` unique
- `KullaniciRol` bir join tablo
- `Kullanici` temel kimlik + auth + profil verisini tasiyor

### Yorum

`KullaniciRol` icin su hali kabul edilebilir:

```prisma
model KullaniciRol {
  id            Int       @id @default(autoincrement())
  rolId         Int
  kullaniciId   Int
  verilmeTarihi DateTime  @default(now())

  @@unique([kullaniciId, rolId])
}
```

Bu tablo 3NF acisindan problemli degil.

### Dikkat edilmesi gereken konu

`Kullanici` tablosunda soft delete var:

```prisma
mail         String @unique
kullaniciAdi String @unique
silmeTarihi  DateTime?
```

Bu normalizasyon problemi degil. Ama operasyonel soru cikarir:

- silinen kullanicinin maili tekrar kullanilabilecek mi?
- silinen kullanicinin username'i tekrar alinabilecek mi?

Su an cevap buyuk ihtimalle hayir, cunku unique direkt aktif.

Bu, `Arac.plaka` icin yaptigin partial unique mantiginin burada henuz olmadigi anlamina gelir.

### Oneri

- Sema olarak buyuk refactor gerekmez
- sadece soft delete + unique reuse karari netlestirilmeli

---

## 3. `AracKutuphanesi` ve `Arac`

### Mevcut durum

```prisma
model AracKutuphanesi {
  id    Int    @id @default(autoincrement())
  marka String @db.VarChar(100)
  model String @db.VarChar(100)

  gercekAraclar Arac[]
}
```

```prisma
model Arac {
  id              Int             @id @default(autoincrement())
  sahipId         Int
  aracKutuphaneId Int
  plaka           String          @db.VarChar(20)
  yil             Int
  maksimumAgirlikKg Decimal       @db.Decimal(10, 2)
  maksimumHacimM3 Decimal?
  kasaTipi        String          @default("DIGER") @db.VarChar(50)
  ...
}
```

### Yorum

Bu tasarim temelde mantikli:

- `AracKutuphanesi` referans katalog
- `Arac` gercek sahip olunan arac

Ama burada da veri butunlugu acigi var:

- repo `marka + model` ile `findFirst(...)` yapiyor
- yeni kayit yoksa olusturuyor
- ama `schema.prisma` icinde `@@unique([marka, model])` yok

Yani ayni marka-model ciftinin katalogda birden fazla satira dusmesi teorik olarak mumkun.

### 3NF notu

Mevcut hali 3NF disi demek sert olur. Ama daha temiz hale getirilebilir.

### Oneri

Minimum:

```prisma
model AracKutuphanesi {
  id    Int    @id @default(autoincrement())
  marka String @db.VarChar(100)
  model String @db.VarChar(100)

  gercekAraclar Arac[]

  @@unique([marka, model])
}
```

Bir adim daha ileri:

- `AracMarka`
- `AracModeli`

diye ayirmak daha dogru olur.

Ornek:

```prisma
model AracMarka {
  id       Int          @id @default(autoincrement())
  ad       String       @unique @db.VarChar(100)
  modeller AracModeli[]
}

model AracModeli {
  id       Int        @id @default(autoincrement())
  markaId  Int
  ad       String     @db.VarChar(100)
  marka    AracMarka  @relation(fields: [markaId], references: [id])
  araclar   Arac[]

  @@unique([markaId, ad])
}
```

Bu zorunlu degil. Ama katalog buyurse daha temiz olur.

### Ek not

`Arac.plaka` icin aktif unique kural DB migration tarafinda var, `schema.prisma` bunu tam gostermiyor:

- `apps/api/prisma/migrations/20260417071918_add_soft_delete_to_vehicles_and_transport_requests/migration.sql`

Yani Prisma semasi tek basina gercek butunlugu tam yansitmiyor.

---

## 4. `Istek`

### Mevcut durum

Bu tablo mevcut semanin en yogun ve en cok yeniden dusunulmesi gereken yeri:

```prisma
model Istek {
  id                      Int       @id @default(autoincrement())
  musteriId               Int
  baslangicSehri          String
  varisSehri              String
  baslangicKonumMetni     String?
  varisKonumMetni         String?
  baslangicProvider       String?
  varisProvider           String?
  baslangicPlaceId        String?
  varisPlaceId            String?
  normalizeBaslangicSehir String?
  normalizeVarisSehir     String?
  normalizeBaslangicIlce  String?
  normalizeVarisIlce      String?
  baslangicEnlem          Decimal
  baslangicBoylam         Decimal
  varisEnlem              Decimal
  varisBoylam             Decimal
  tekTasimaIstiyor        Boolean
  agirlikKg               Decimal?
  hacimM3                 Decimal?
  yukTipi                 String
  tasimaTarihi            String?
  yukDetay                String
  olusturmaTarihi         DateTime
  silmeTarihi             DateTime?
  durumId                 Int
  ...
}
```

### Repo davranisi ne diyor

`transport-requests.service.ts` icinde backend sunu yapiyor:

1. frontend sadece `provider`, `placeId`, `sessionToken` gonderiyor
2. backend Google Place Details ile canonical konum uretiyor
3. canonical sonucu `Istek` kolonlarina yayıyor

Ayrica `offers.repository.ts` tarafinda filtreleme yapilirken sunlar beraber kullaniliyor:

- `normalizeBaslangicSehir`
- `baslangicSehri`
- `normalizeVarisSehir`
- `varisSehri`

Bu da su an tabloda legacy + canonical verinin birlikte tasindigini gosteriyor.

### Problem 1: tekrar eden grup kokusu

`baslangic*` ve `varis*` kolonlari aslinda ayni yapinin iki kopyasi.

1NF teknik acidan bakarsan kolonlar atomic, yani tam ihlal demek zor.
Ama modelleme acidan tekrar eden grup kokusu var.

### Problem 2: duplicate bilgi

En net duplicate:

- `baslangicSehri`
- `normalizeBaslangicSehir`

ve

- `varisSehri`
- `normalizeVarisSehir`

Yeni kayitlarda bunlar fiilen ayni seyi tasiyor.

Bu tam bir 3NF baskisi.

### Problem 3: transitive dependency hissi

Su kolonlar grubu ayni dis kimligin snapshot'i:

- `baslangicPlaceId`
- `baslangicKonumMetni`
- `baslangicSehri`
- `normalizeBaslangicSehir`
- `normalizeBaslangicIlce`
- `baslangicEnlem`
- `baslangicBoylam`

Strict okursan bunlarin bazisi `placeId` veya provider detail sonucundan tureyen alanlar gibi davranir.
Pratikte ise burada hakli bir sebep var:

- Google verisi "o anki secimi" temsil ediyor
- request acildigi andaki snapshot korunmak isteniyor

Yani burada "her seyi ayri master tabloya tasiyalim" demek dogru degil.

### Problem 4: tarih tipi

`tasimaTarihi` su an:

```prisma
tasimaTarihi String? @db.VarChar(10)
```

Bu normalizasyon problemi kadar domain problemi de:

- tarih, string gibi davranmiyor
- date olarak davranmali

### Bence dogru cozum

`Istek` tablosundaki konum alanlarini ayri child tabloya cikarmak.

Ornek:

```prisma
enum KonumYonu {
  BASLANGIC
  VARIS
}

model Istek {
  id              Int          @id @default(autoincrement())
  musteriId       Int
  musteri         Kullanici    @relation(fields: [musteriId], references: [id])
  tekTasimaIstiyor Boolean     @default(false)
  agirlikKg       Decimal?
  hacimM3         Decimal?
  yukTipi         String       @default("GENEL") @db.VarChar(50)
  tasimaTarihi    DateTime?    @db.Date
  yukDetay        String       @db.VarChar(500)
  olusturmaTarihi DateTime     @default(now())
  silmeTarihi     DateTime?
  durumId         Int
  durum           Durum        @relation(fields: [durumId], references: [id])

  konumlar        IstekKonum[]
  teklifler       Teklif[]
  nakliye         Nakliye?
}

model IstekKonum {
  id         Int        @id @default(autoincrement())
  istekId    Int
  yon        KonumYonu
  provider   String?    @db.VarChar(50)
  placeId    String?    @db.VarChar(255)
  konumMetni String     @db.VarChar(255)
  sehir      String     @db.VarChar(100)
  ilce       String?    @db.VarChar(100)
  enlem      Decimal    @db.Decimal(9, 6)
  boylam     Decimal    @db.Decimal(9, 6)

  istek      Istek      @relation(fields: [istekId], references: [id])

  @@unique([istekId, yon])
  @@index([sehir])
}
```

Bu yapida:

- `Istek` sadece request cekirdegi olur
- konum snapshot'i ayri varlik olur
- `baslangic*` / `varis*` tekrar eden kolon aileleri kalkar
- duplicate sehir alanlari azalir

### Kritik prensip

Ben burada ayri bir `GooglePlace` master tablosu zorunlu gormuyorum.

Cunku bu sistemde asil ihtiyac:

- canli Google kaydini degil
- request olusturuldugu andaki snapshot'i saklamak

Bu nedenle en dogru normalizasyon:

- `Istek` -> `IstekKonum` iliskisi

---

## 5. `Teklif`

### Mevcut durum

```prisma
model Teklif {
  id          Int       @id @default(autoincrement())
  istekId     Int
  nakliyeciId Int
  aracId      Int?
  fiyat       Decimal   @db.Decimal(12, 2)
  not         String?   @db.VarChar(255)
  durumId     Int
}
```

### Yorum

Bu tablo genel olarak temiz.

- teklif cekirdegi burada
- status ayri lookup ile geliyor
- request ve carrier iliskisi net

### Not

Burada normalizasyon problemi yerine business-rule konusu daha fazla var.

Ornek:

- bir nakliyeci ayni istek icin kac teklif uretebilir?

Eger kural "bir nakliyeci bir istek icin tek teklif verir" ise:

```prisma
@@unique([istekId, nakliyeciId])
```

dusunulebilir.

Ama bu 3NF konusu degil, is kurali konusu.

---

## 6. `Nakliye`

### Mevcut durum

```prisma
model Nakliye {
  id              Int       @id @default(autoincrement())
  istekId         Int       @unique
  nakliyeciId     Int
  aracId          Int
  anlasilanFiyat  Decimal   @db.Decimal(12, 2)
  olusturmaTarihi DateTime  @default(now())
  baslangicTarihi DateTime?
  teslimTarihi    DateTime?
  durumId         Int
}
```

### Yorum

Bu tablo mantikli.

- bir istekten en fazla bir nakliye cikiyor
- `istekId @unique` bunu dogru ifade ediyor

3NF tarafinda belirgin sorun gormuyorum.

---

## 7. `PuanTanimlari` ve `Puanlama`

### Mevcut durum

```prisma
model PuanTanimlari {
  id           Int     @id @default(autoincrement())
  puanlamaTuru String  @db.VarChar(100)
  aciklama     String? @db.VarChar(200)
}
```

```prisma
model Puanlama {
  id          Int       @id @default(autoincrement())
  nakliyeId   Int
  puanlayanId Int
  puanlananId Int
  puanTanimId Int
  puanDegeri  Int
  yorum       String?   @db.VarChar(500)
  tarih       DateTime  @default(now())

  @@unique([nakliyeId, puanlayanId, puanlananId])
}
```

### Yorum

`Puanlama` tablosu iyi.

Ama `PuanTanimlari` icin repo gercegi su:

- `ratings.service.ts` sabit olarak `SAYISAL_1_5` ariyor

Yani sistem su an fiilen tek rating scheme ile calisiyor.

### Olasi durumlar

#### Senaryo A: tek rating scheme kalacak

O zaman `PuanTanimlari` gereksiz abstraction olabilir.

Bu durumda:

- `puanTanimId` kalkar
- `puanDegeri` kalir
- gerekirse enum olarak `skala` tutulur

#### Senaryo B: gercekten birden fazla rating scheme gelecek

O zaman tablo kalabilir. Ama en az su gerekli:

```prisma
model PuanTanimlari {
  id           Int     @id @default(autoincrement())
  puanlamaTuru String  @unique @db.VarChar(100)
  aciklama     String? @db.VarChar(200)
}
```

Hatta imkan varsa:

- `minDeger`
- `maxDeger`
- `veriTipi`

gibi alanlar da dusunulmeli.

---

## 8. `Bildirim`

### Mevcut durum

```prisma
model Bildirim {
  id              Int       @id @default(autoincrement())
  kullaniciId     Int
  tip             String    @db.VarChar(100)
  baslik          String    @db.VarChar(150)
  mesaj           String    @db.VarChar(300)
  hedefUrl        String?   @db.VarChar(255)
  olayAnahtari    String?   @unique @db.VarChar(200)
  okunmaTarihi    DateTime?
  olusturmaTarihi DateTime  @default(now())
}
```

### Yorum

Bu tablo temelde iyi.

Ama `tip` su an free-text string. Oysa publisher tarafinda sabit bir liste var:

- `TEKLIF_GELDI`
- `TEKLIF_KABUL_EDILDI`
- `TEKLIF_REDDEDILDI`
- `IS_BASLADI`
- `IS_TAMAMLANDI`
- `RATING_ALDIN`
- `RATING_BEKLIYOR`

### Oneri

Burada lookup tabloya bile gerek yok. Enum yeterli.

Ornek:

```prisma
enum BildirimTipi {
  TEKLIF_GELDI
  TEKLIF_KABUL_EDILDI
  TEKLIF_REDDEDILDI
  IS_BASLADI
  IS_TAMAMLANDI
  RATING_ALDIN
  RATING_BEKLIYOR
}
```

ve

```prisma
tip BildirimTipi
```

---

# Benim 3NF Sonuc Tablosu

| Alan | Mevcut durum | Yorum |
|---|---|---|
| `Durum` | Kismen iyi | Domain olarak fazla generic, unique eksik |
| `Rol/Kullanici/KullaniciRol` | Iyi | Buyuk refactor gerekmiyor |
| `AracKutuphanesi` | Orta | `@@unique([marka, model])` eksik |
| `Arac` | Iyi | `kasaTipi` enum/lookup olabilir |
| `Istek` | En sorunlu bolum | Konum snapshot + duplicate + legacy fallback ayni tabloda |
| `Teklif` | Iyi | Business rule unique'leri dusunulebilir |
| `Nakliye` | Iyi | Belirgin normalizasyon sorunu yok |
| `PuanTanimlari` | Fazla soyut olabilir | Tek scheme varsa sadeleşebilir, kalacaksa unique lazim |
| `Puanlama` | Iyi | Yapisi mantikli |
| `Bildirim` | Iyiye yakin | `tip` enum olmali |

---

# 3NF'e Daha Yakin Onerilen Hedef Tasarim

## Zorunlu degisimler

1. `Durum` icin `@@unique([durumTuru, durumAdi])`
2. `AracKutuphanesi` icin `@@unique([marka, model])`
3. `PuanTanimlari.puanlamaTuru` icin `@unique`
4. `Istek.tasimaTarihi` alanini `Date` tabanli yapmak
5. `Istek` icindeki duplicate sehir alanlarini temizlemek

## Kuvvetle onerilen degisim

1. `Istek` icin ayri `IstekKonum` tablosu
2. `Bildirim.tip` icin enum
3. `Durum` icin generic lookup yerine domain enum veya domain lookup

## Opsiyonel ama iyi refactor

1. `AracKutuphanesi`ni `AracMarka` + `AracModeli` olarak ayirmak
2. `PuanTanimlari`ni tamamen kaldirmak, eger tek skala kullanilacaksa
3. `KullaniciRol` icin surrogate `id` yerine composite PK dusunmek

---

# Ornek Hedef Prisma Taslagi

Asagidaki taslak benim "pratik + 3NF'e daha yakin" tercih ettigim yapi:

```prisma
enum IstekDurumKodu {
  OLUSTURULDU
  ANLASILDI
  TAMAMLANDI
}

enum TeklifDurumKodu {
  OLUSTURULDU
  KABUL_EDILDI
  REDDEDILDI
}

enum NakliyeDurumKodu {
  OLUSTURULDU
  BASLATILDI
  TAMAMLANDI
}

enum KonumYonu {
  BASLANGIC
  VARIS
}

enum BildirimTipi {
  TEKLIF_GELDI
  TEKLIF_KABUL_EDILDI
  TEKLIF_REDDEDILDI
  IS_BASLADI
  IS_TAMAMLANDI
  RATING_ALDIN
  RATING_BEKLIYOR
}

model AracKutuphanesi {
  id            Int    @id @default(autoincrement())
  marka         String @db.VarChar(100)
  model         String @db.VarChar(100)
  gercekAraclar Arac[]

  @@unique([marka, model])
}

model Istek {
  id               Int          @id @default(autoincrement())
  musteriId        Int
  musteri          Kullanici    @relation(fields: [musteriId], references: [id])
  tekTasimaIstiyor Boolean      @default(false)
  agirlikKg        Decimal?
  hacimM3          Decimal?
  yukTipi          String       @default("GENEL") @db.VarChar(50)
  tasimaTarihi     DateTime?    @db.Date
  yukDetay         String       @db.VarChar(500)
  olusturmaTarihi  DateTime     @default(now())
  silmeTarihi      DateTime?
  durum            IstekDurumKodu @default(OLUSTURULDU)

  konumlar         IstekKonum[]
  teklifler        Teklif[]
  nakliye          Nakliye?
}

model IstekKonum {
  id         Int        @id @default(autoincrement())
  istekId    Int
  yon        KonumYonu
  provider   String?    @db.VarChar(50)
  placeId    String?    @db.VarChar(255)
  konumMetni String     @db.VarChar(255)
  sehir      String     @db.VarChar(100)
  ilce       String?    @db.VarChar(100)
  enlem      Decimal    @db.Decimal(9, 6)
  boylam     Decimal    @db.Decimal(9, 6)
  istek      Istek      @relation(fields: [istekId], references: [id])

  @@unique([istekId, yon])
  @@index([sehir])
}

model Bildirim {
  id              Int          @id @default(autoincrement())
  kullaniciId     Int
  kullanici       Kullanici    @relation(fields: [kullaniciId], references: [id])
  tip             BildirimTipi
  baslik          String       @db.VarChar(150)
  mesaj           String       @db.VarChar(300)
  hedefUrl        String?      @db.VarChar(255)
  olayAnahtari    String?      @unique @db.VarChar(200)
  okunmaTarihi    DateTime?
  olusturmaTarihi DateTime     @default(now())

  @@index([kullaniciId, okunmaTarihi, olusturmaTarihi])
}
```

Bu taslakta en buyuk kazanc `Istek` tarafinda gelir.

---

# Migration Sirasi

Bu semayi bir anda kirip degistirmek dogru olmaz. Asagidaki sira daha saglikli:

1. Yeni unique constraint'leri ekle
   - `Durum(durumTuru, durumAdi)`
   - `AracKutuphanesi(marka, model)`
   - `PuanTanimlari(puanlamaTuru)`
2. `IstekKonum` tablosunu ekle
3. Mevcut `Istek` kayitlarindan `IstekKonum` tablosuna backfill yap
4. Backend okuma/yazma katmanini yeni tabloya gecir
5. Frontend DTO response'larini yeni yapidan besle
6. Eski duplicate kolonlari asamali olarak drop et
7. Son adimda `Durum` icin enum veya domain lookup refactor'unu yap

---

# Nihai Hukum

Bu repo semasi su an:

- is gorur
- buyuk resmi bozuk degil
- ama tam temiz 3NF degil

En buyuk problem butun sema degil, `Istek` tablosunun fazla sorumluluk yuklenmesi.

Benim net oncelik siram su olurdu:

1. `Istek` location alanlarini normalize et
2. lookup tablolardaki dogal unique'leri tamamla
3. `tasimaTarihi`ni date yap
4. `Durum`u generic yapıdan domain bazli daha temiz hale getir

Bu yapilirsa sema hem daha okunur olur hem de AI ile hizli gelismis olsa bile artik daha bilincli bir veri modeline donmus olur.
