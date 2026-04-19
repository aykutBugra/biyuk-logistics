# Vehicle Tarih Alanlari ve Soft Delete Senaryosu

Bu raporun amaci, `Arac` tablosuna:

- `olusturmaTarihi`
- `guncellemeTarihi`
- `silmeTarihi`

alanlarini eklemek istediginde, **hangi dosyada hangi adimla ilerlemen gerektigini** anlatmaktir.

Bu dosya sadece plan ve ogrenme notudur.

- Kodlari burada gosterir.
- Uygulama dosyalarina dokunmaz.
- Sen bu plana bakip ilgili dosyalari elle guncelleyebilirsin.

---

## 1. Ilk Dogru Adim: `schema.prisma`

**Dosya:** `apps/api/prisma/schema.prisma`

Su an sende bu alanlar yorum olarak duruyor:

```prisma
//olusturmaTarihi DateTime @default(now())
//guncellemeTarihi DateTime @updatedAt
//silmeTarihi     DateTime?
```

Bu haliyle sadece nottur. Veritabanina kolon eklemez.

Gercek senaryoda bunlari `model Arac` icine **gercek field** olarak yazman gerekir:

```prisma
model Arac {
  id                Int             @id @default(autoincrement())
  sahipId           Int
  sahip             Kullanici       @relation(fields: [sahipId], references: [id])
  aracKutuphaneId   Int
  aracBilgisi       AracKutuphanesi @relation(fields: [aracKutuphaneId], references: [id])
  plaka             String          @unique @db.VarChar(20)
  yil               Int
  kapasite          Decimal         @db.Decimal(10, 2)
  olusturmaTarihi   DateTime        @default(now())
  guncellemeTarihi  DateTime        @updatedAt
  silmeTarihi       DateTime?

  nakliyeler        Nakliye[]
}
```

### Bu alanlar ne ise yarar?

- `olusturmaTarihi`
  - kaydin ilk olusturuldugu an
- `guncellemeTarihi`
  - kayit her update oldugunda Prisma tarafindan otomatik guncellenir
- `silmeTarihi`
  - soft delete yapacaksan silindigi tarihi tutar
  - `null` ise kayit aktif demektir

---

## 2. Migration ve Prisma Client guncelleme

**Calisma dizini:**

```powershell
cd C:\Users\aykut\nakliye-app\apps\api
```

**Migration komutu:**

```powershell
npx prisma migrate dev --name add_vehicle_timestamps_soft_delete
```

Bu komut:

- yeni migration uretir
- veritabanina uygular
- kolonlari tabloya ekler

Sonra Prisma client'i yenilemek iyi pratiktir:

```powershell
npm run prisma:generate
```

Not:
- `migrate dev` cogu durumda generate de yapar
- ama `prisma:generate` ayri calistirmak sorun degil

---

## 3. Sonraki Adim: Repository tarafini zenginlestirme

Kolonlari DB'ye eklemek tek basina yetmez.
Bu verileri okuyup response'a tasiman gerekir.

**Dosya:** `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

### 3.1. `vehicleSelect` genisletilir

Su an `vehicleSelect` sadece:

- `id`
- `plaka`
- `yil`
- `kapasite`
- `aracBilgisi.marka`
- `aracBilgisi.model`

cekiyor.

Buraya zaman alanlari da eklenir:

```ts
const vehicleSelect = {
  id: true,
  plaka: true,
  yil: true,
  kapasite: true,
  olusturmaTarihi: true,
  guncellemeTarihi: true,
  silmeTarihi: true,
  aracBilgisi: {
    select: {
      marka: true,
      model: true,
    },
  },
} satisfies Prisma.AracSelect;
```

### 3.2. `StoredVehicleRecord` tipi genisletilir

Su an `StoredVehicleRecord` zaman alanlarini tasimiyor.

Onu da genisletmen gerekir:

```ts
export type StoredVehicleRecord = {
  id: number;
  plaka: string;
  marka: string;
  model: string;
  yil: number;
  kapasite: number;
  olusturmaTarihi: Date;
  guncellemeTarihi: Date;
  silmeTarihi: Date | null;
};
```

### 3.3. `mapStoredVehicle(...)` guncellenir

Bu method repository'den gelen ham kaydi uygulama icindeki temiz tipe ceviriyor.
Buraya yeni alanlar da eklenir:

```ts
private mapStoredVehicle(vehicle: StoredVehicleQuery): StoredVehicleRecord {
  return {
    id: vehicle.id,
    plaka: vehicle.plaka,
    marka: vehicle.aracBilgisi.marka,
    model: vehicle.aracBilgisi.model,
    yil: vehicle.yil,
    kapasite: vehicle.kapasite.toNumber(),
    olusturmaTarihi: vehicle.olusturmaTarihi,
    guncellemeTarihi: vehicle.guncellemeTarihi,
    silmeTarihi: vehicle.silmeTarihi,
  };
}
```

---

## 4. DTO karari burada kritik

**Dosyalar:**

- `apps/api/src/modules/vehicles/dto/vehicle-list-item-response.dto.ts`
- `apps/api/src/modules/vehicles/dto/vehicle-detail-response.dto.ts`

Su an:

```ts
export class VehicleDetailResponseDto extends VehicleListItemResponseDto {}
```

Bu ne demek?

- detail DTO ile list DTO ayni sekilde donuyor

Ama senin yeni ihtiyacin su:

- kullanici `olusturmaTarihi` ve `guncellemeTarihi` gorsun
- `silmeTarihi` gorunmesin

Burada iki secenek var.

### Secenek A: Listeye de tarihleri koy

`VehicleListItemResponseDto` icine:

```ts
olusturmaTarihi!: string;
guncellemeTarihi!: string;
```

eklersin. Bu durumda:

- hem `my list`
- hem `detail`

bu alanlari gormeye baslar.

### Secenek B: Sadece detail'e koy

Bu senaryoda daha dogru olan bence bu.

`VehicleListItemResponseDto` sade kalir.
`VehicleDetailResponseDto` artik `extends` ile yetinmez, ayri alanlar kazanir:

```ts
import { VehicleListItemResponseDto } from "./vehicle-list-item-response.dto";

export class VehicleDetailResponseDto extends VehicleListItemResponseDto {
  olusturmaTarihi!: string;
  guncellemeTarihi!: string;
}
```

Bu daha iyi cunku:

- liste ekrani gereksiz kalabalik olmaz
- detail ekrani daha zengin olur
- `silmeTarihi` yine API response'a cikmaz

Bu senaryoda **Secenek B daha dogru**.

---

## 5. Service katmaninda mapping guncellemesi

**Dosya:** `apps/api/src/modules/vehicles/vehicles.service.ts`

Burada kritik yer:

- `toListItemResponse(...)`
- `toDetailResponse(...)`

### 5.1. Liste mapper'i sade kalabilir

Eger tarihleri sadece detail'de gostereceksen:

```ts
private toListItemResponse(
  vehicle: StoredVehicleRecord
): VehicleListItemResponseDto {
  return {
    id: vehicle.id,
    plaka: vehicle.plaka,
    marka: vehicle.marka,
    model: vehicle.model,
    yil: vehicle.yil,
    kapasite: vehicle.kapasite,
  };
}
```

Bu ayni kalabilir.

### 5.2. Detail mapper zenginlesir

Detail response burada kurulacak:

```ts
private toDetailResponse(
  vehicle: StoredVehicleRecord
): VehicleDetailResponseDto {
  return {
    ...this.toListItemResponse(vehicle),
    olusturmaTarihi: vehicle.olusturmaTarihi.toISOString(),
    guncellemeTarihi: vehicle.guncellemeTarihi.toISOString(),
  };
}
```

Neden string?

- JSON response'ta tarihleri duzgun tasimak icin
- frontend tarafinda parse/format etmek daha kolay olsun diye

### 5.3. `silmeTarihi` neden burada donmuyor?

Cunku senin ihtiyacin:

- kullanici `olusturmaTarihi`
- kullanici `guncellemeTarihi`

gorur

ama:

- `silmeTarihi` sadece DB tarafinda kalir

Bu nedenle service tarafinda `silmeTarihi` response'a map edilmez.

---

## 6. Soft delete gercekten kullanilacaksa ek is

Senaryonda `silmeTarihi` sadece kolonu eklemek degil, ileride silme mantigi icin de anlamli.

Eger gercek soft delete yapacaksan sadece kolon eklemek yetmez.

### 6.1. Delete akisi degisir

Su an delete hard delete ise:

- kaydi fiziksel olarak siliyorsun

Soft delete'te ise:

- kaydi silmezsin
- `silmeTarihi = now()` yaparsin

### 6.2. Listeleme sorgulari degisir

`findManyByOwnerId(...)` gibi yerlerde:

```ts
where: {
  sahipId,
  silmeTarihi: null,
}
```

filtre gerekir.

### 6.3. Detail sorgusu da degisir

`findByIdAndOwnerId(...)` gibi yerlerde de:

```ts
where: {
  id,
  sahipId,
  silmeTarihi: null,
}
```

filtre gerekir.

Yoksa soft delete edilmis kayitlar hala gorunur.

### 6.4. Update sorgusu da filtrelenmeli

Soft delete edilmis kaydi update edemez hale getirmek istiyorsan,
update once:

- `silmeTarihi: null`

kontrolune dayanmali.

### 6.5. Bu senaryoda `silmeTarihi` sadece DB icinse

Senin cümlene gore:

- kullanici eklenme/guncellenme tarihini gorecek
- `silmeTarihi` sadece bizde kalacak

Bu durumda soft delete mantigi uygulamaya daha sonra da eklenebilir.
Ama tam soft delete istiyorsan yukaridaki sorgu filtreleri zorunlu olur.

---

## 7. Frontend API tiplerini guncelleme

**Dosya:** `apps/web/src/lib/api/vehicles.ts`

Su an:

```ts
export type VehicleDetail = VehicleListItem;
```

Bu artik yetersiz kalir.

Eger detail response'a tarih alanlari ekliyorsan bunu ayirmalisin:

```ts
export type VehicleDetail = VehicleListItem & {
  olusturmaTarihi: string;
  guncellemeTarihi: string;
};
```

Neden?

- detail ekraninda yeni alanlar TypeScript tarafinda bilinsin diye

`VehicleListItem` ayni kalabilir.

---

## 8. Kullaniciya tarihleri gosterilecek ekran

En dogal yer:

**Dosya:** `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

Bu zaten detail ekrani.
Burada su an:

- marka
- model
- plaka
- yil
- kapasite

gosteriliyor.

Buraya iki yeni satir eklemek en dogal cozum:

- Eklenme tarihi
- Son guncellenme tarihi

Ornek render fikri:

```tsx
<div className="flex items-center justify-between gap-4">
  <dt className="font-medium text-gray-900">Eklenme tarihi</dt>
  <dd>{formatDate(vehicle.olusturmaTarihi)}</dd>
</div>
<div className="flex items-center justify-between gap-4">
  <dt className="font-medium text-gray-900">Son guncellenme</dt>
  <dd>{formatDate(vehicle.guncellemeTarihi)}</dd>
</div>
```

Burada yeni bir format helper dusunursun:

```ts
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
```

Bu sayede ISO string'i kullanici dostu tarihe cevirirsin.

---

## 9. Update sayfasi icin ekstra bir sey gerekir mi?

**Dosya:** `apps/web/src/app/dashboard/araclarim/[id]/duzenle/page.tsx`

Bu sayfada tarih alanlarini input olarak gostermek zorunda degilsin.

Neden?

- `olusturmaTarihi` ve `guncellemeTarihi` kullanicinin duzenleyecegi alanlar degil
- bunlar sistem tarafindan yonetilen metadata

Bu nedenle:

- edit formuna input olarak ekleme
- sadece detail ekranda goster

Bu daha dogru tasarim.

---

## 10. Dosya dosya yazim sirasi

Eger bunu elle yazacak olsaydin, ben su sirayla giderdim:

### Adim 1
`apps/api/prisma/schema.prisma`

- alanlari yorumdan cikar
- `model Arac` icine gercek field olarak ekle

### Adim 2
Terminal:

```powershell
cd C:\Users\aykut\nakliye-app\apps\api
npx prisma migrate dev --name add_vehicle_timestamps_soft_delete
npm run prisma:generate
```

### Adim 3
`apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

- `vehicleSelect`
- `StoredVehicleRecord`
- `mapStoredVehicle`

guncellenir

### Adim 4
`apps/api/src/modules/vehicles/dto/vehicle-detail-response.dto.ts`

- detail DTO'ya tarih alanlari eklenir

### Adim 5
`apps/api/src/modules/vehicles/vehicles.service.ts`

- `toDetailResponse(...)` tarih alanlarini response'a ekler
- `toListItemResponse(...)` sade kalabilir

### Adim 6
`apps/web/src/lib/api/vehicles.ts`

- `VehicleDetail` tipi genisletilir

### Adim 7
`apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

- yeni tarih satirlari detail ekrana eklenir
- gerekirse `formatDate` helper yazilir

### Adim 8
Eger soft delete davranisi da isteniyorsa:

- repository sorgularina `silmeTarihi: null` filtresi eklenir
- delete akisi hard delete yerine timestamp update'e cevrilir

---

## 11. Bu senaryoda hangi dosyalara dokunursun?

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`
- `apps/api/src/modules/vehicles/dto/vehicle-detail-response.dto.ts`
- `apps/api/src/modules/vehicles/vehicles.service.ts`
- `apps/web/src/lib/api/vehicles.ts`
- `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

Soft delete davranisini da tam aktif edecek olursan ek olarak:

- `apps/api/src/modules/vehicles/vehicles.service.ts`
- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

delete/list/detail/update sorgularinin tamamina tekrar dokunursun.

---

## 12. En kritik duzeltme

Senaryonda en kritik mimari nokta su:

`VehicleDetailResponseDto` su an `VehicleListItemResponseDto`'dan turetiliyor.

Eger sadece detail ekranda tarih gostermek istiyorsan:

- list DTO'yu sisirme
- detail DTO'yu ayir

Yani burada en temiz karar:

- `list` sade kalsin
- `detail` zenginlessin

---

## Kisa Ozet

Dogru siralama su:

1. `schema.prisma` icine alanlari gercek field olarak ekle
2. migration + prisma generate calistir
3. repository select/type/map kisimlarini guncelle
4. detail DTO'ya tarih alanlarini ekle
5. service `toDetailResponse(...)` tarafinda bunlari map et
6. frontend `VehicleDetail` tipini genislet
7. detail sayfada tarihleri goster
8. soft delete gercekten kullanilacaksa delete ve sorgu filtrelerini de ayrica degistir

Bu senaryoda:

- `olusturmaTarihi` ve `guncellemeTarihi` kullaniciya gosterilir
- `silmeTarihi` DB'de kalir
- edit formuna tarih input'u eklenmez
