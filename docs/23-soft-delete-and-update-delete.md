# Amaç

Bu adımda `vehicles` ve `transport-requests` modülleri aynı olgunluk seviyesine getirildi. Hedef; iki modülde de `update`, `delete`, `soft delete`, aktif kayıt filtreleme, ownership ve role korumasını mevcut mimariyi bozmadan tamamlamaktı.

# Bu Adımda Ne Değişti

- `Arac` ve `Istek` modellerine `silmeTarihi` alanı eklendi.
- `vehicles` tarafında `update` akışı temizlenip `delete` hard delete yerine soft delete yapacak hale getirildi.
- `transport-requests` tarafına backend `PUT` ve `DELETE` endpointleri eklendi.
- `transport-requests` frontend tarafına liste/detail/edit/delete akışları eklendi.
- `vehicles` frontend tarafında liste ekranına `Detay`, `Duzenle`, `Sil` aksiyonları eklendi.
- Soft deleted kayıtlar iki modülde de listede görünmez, detail'de bulunamaz ve tekrar update/delete edilemez hale getirildi.

# Schema Değişiklikleri

Değişen ana dosya:

- [schema.prisma](/c:/Users/aykut/nakliye-app/apps/api/prisma/schema.prisma)

Eklenen alanlar:

```prisma
model Arac {
  ...
  silmeTarihi DateTime?
}

model Istek {
  ...
  silmeTarihi DateTime?
}
```

Vehicle plaka kararı için yapılan değişiklik:

```prisma
plaka String @db.VarChar(20)
```

`@unique` kaldırıldı. Bunun sebebi soft delete edilmiş araç plakasının tekrar kullanılabilmesini istememizdi.

Not:

- Prisma şeması tek başına "yalnızca aktif araçlarda unique plaka" kuralını ifade etmiyor.
- Bu yüzden generated migration SQL içine manuel olarak partial unique index eklenmeli.

Önerilen migration adı:

- `add_soft_delete_to_vehicles_and_transport_requests`

Önerilen lokal akış:

1. `cd C:\Users\aykut\nakliye-app\apps\api`
2. `npx prisma migrate dev --create-only --name add_soft_delete_to_vehicles_and_transport_requests`
3. generated migration SQL içine aktif kayıtlar için partial unique index ekle
4. `npx prisma migrate dev`
5. `npm run prisma:generate`

Eklenecek SQL mantığı:

```sql
CREATE UNIQUE INDEX "Arac_plaka_active_unique"
ON "Arac" ("plaka")
WHERE "silmeTarihi" IS NULL;
```

# Soft Delete Yaklaşımı

Genel kural:

- silme işlemi fiziksel silme yapmaz
- ilgili kaydın `silmeTarihi` alanına `now()` yazılır
- aktif kayıt sorguları `silmeTarihi: null` filtresiyle çalışır

Bu kararla beraber:

- soft deleted kayıtlar listede görünmez
- detail endpointlerinde 404 gibi davranır
- update edilemez
- delete tekrar çağrılırsa yine 404 mantığı oluşur

Bu yaklaşım hem veri kaybını önler hem de mevcut ownership kurallarıyla uyumlu kalır.

# Vehicles Tarafında Yapılanlar

Değişen dosyalar:

- [vehicles.controller.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/vehicles/vehicles.controller.ts)
- [vehicles.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/vehicles/vehicles.service.ts)
- [vehicles.repository.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/vehicles/repositories/vehicles.repository.ts)
- [update-vehicle.dto.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/vehicles/dto/update-vehicle.dto.ts)
- [vehicles.ts](/c:/Users/aykut/nakliye-app/apps/web/src/lib/api/vehicles.ts)
- [araclarim/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/araclarim/page.tsx)
- [araclarim/[id]/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/araclarim/[id]/page.tsx)
- [araclarim/[id]/duzenle/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/araclarim/[id]/duzenle/page.tsx)

Backend tarafında:

- `PUT /vehicles/:id` aktif ve sahibine ait aracı güncelliyor
- `DELETE /vehicles/:id` artık hard delete yapmıyor, soft delete yapıyor
- `GET /vehicles/my` ve `GET /vehicles/:id` sadece aktif kayıtları döndürüyor
- mevcut create akışı korunurken plaka conflict davranışı sürdürüldü

Önemli karar:

- soft delete edilmiş araç plakasının tekrar kullanılmasına izin verildi
- bu yüzden DB tarafında aktif kayıtlar için partial unique index gerekli

Frontend tarafında:

- araç listesine `Detay`, `Duzenle`, `Sil` aksiyonları eklendi
- detail sayfasındaki `Duzenle` ve `Sil` aksiyonları korundu
- edit sayfası ayrı route olarak devam etti
- silme sonrası kullanıcı listede aktif araçları görmeye devam eder

# Transport Requests Tarafında Yapılanlar

Değişen dosyalar:

- [transport-requests.controller.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/transport-requests.controller.ts)
- [transport-requests.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/transport-requests.service.ts)
- [transport-requests.repository.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/repositories/transport-requests.repository.ts)
- [update-transport-request.dto.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/dto/update-transport-request.dto.ts)
- [transport-requests.ts](/c:/Users/aykut/nakliye-app/apps/web/src/lib/api/transport-requests.ts)
- [isteklerim/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/isteklerim/page.tsx)
- [isteklerim/[id]/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/isteklerim/[id]/page.tsx)
- [isteklerim/[id]/duzenle/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/isteklerim/[id]/duzenle/page.tsx)

Backend tarafında eklenen yüzey:

- `PUT /transport-requests/:id`
- `DELETE /transport-requests/:id`

Update kapsamı şu alanlarla sınırlandı:

- `baslangicSehri`
- `varisSehri`
- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`
- `yukDetay`

Davranış:

- sadece `MUSTERI` rolü
- sadece sahibine ait kayıt
- sadece aktif kayıt
- soft deleted request listede görünmez
- detail'de 404 davranır
- update edilemez
- delete tekrar çağrılırsa 404 davranır

Frontend kararı:

- request edit ekranı ayrı route seçildi: `/dashboard/isteklerim/[id]/duzenle`
- sebep; vehicles tarafındaki desenle uyumlu olması ve detail ekranını gereksiz form state ile karıştırmaması

# Backend Katmanlarında Yapılan Düzenlemeler

Controller katmanında:

- yeni `PUT` ve `DELETE` endpointleri eklendi
- mevcut guard ve role zinciri korundu
- body tipleri DTO ile tanımlı kaldı

Service katmanında:

- vehicles update akışındaki eski `create/update` karışıklığı temizlendi
- ownership ve role kontrolleri korundu
- soft delete çağrıları repository üzerinden merkezi hale getirildi
- soft deleted kayıtlar için `NotFoundException` verilecek çizgi korundu

Repository katmanında:

- aktif kayıt sorguları `silmeTarihi: null` ile çalışacak hale getirildi
- vehicles için `softDeleteByIdAndOwnerId`, `updateByIdAndOwnerId`
- transport-requests için `softDeleteByIdAndCustomerId`, `updateByIdAndCustomerId`
- create/list/detail akışları soft delete filtresiyle uyumlandı

# Frontend Tarafında Yapılan Düzenlemeler

Vehicles:

- listede aksiyon butonları eklendi
- detail sayfası silme + edit linkiyle korundu
- edit sayfası mevcut ayrı route deseniyle sürdü

Transport Requests:

- API helper katmanına `updateTransportRequest` ve `deleteTransportRequest` eklendi
- listede `Detay`, `Duzenle`, `Sil` aksiyonları eklendi
- detail ekranına header aksiyonları eklendi
- yeni edit route oluşturuldu
- create form yapısı edit ekranına referans alındı

Ortak davranış:

- `401` durumunda auth temizlenip login'e yönlendirme korundu
- `403` durumunda role/ownership dışı erişim ana sayfaya döndürülüyor
- `404` durumunda soft deleted veya bulunmayan kayıt yokmuş gibi ele alınıyor

# Ownership ve Role Kuralları

Vehicles:

- sadece `NAKLIYECI`
- sadece kendi aracı

Transport Requests:

- sadece `MUSTERI`
- sadece kendi isteği

Bu kurallar hem controller guard/role seviyesinde hem de service/repository sorgu filtrelerinde korundu.

# Delete Davranışı Neden Hard Delete Değil

Hard delete yerine soft delete seçilmesinin sebepleri:

- yanlış silmelerde veri kaybını azaltır
- ileride restore/raporlama ihtimalini açık bırakır
- kayıtların aktif yüzeyden gizlenmesini sağlar
- mevcut domain’i büyütürken daha güvenli bir temel sunar

Bu fazda restore yazılmadı ama zemin hazırlanmış oldu.

# Update Kapsamı ve Sınırları

Vehicles update:

- marka
- model
- plaka
- yil
- kapasite

Transport requests update:

- şehirler
- koordinatlar
- yük detayı

Bilinçli olarak alınmayan şeyler:

- request status transition
- teklif/job bağlamı
- soft deleted kayıtları geri alma
- toplu işlemler

# Test / Kontrol Sonuçları

Çalıştırılan komutlar:

- `npm run prisma:generate` (`apps/api`)
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Sonuç:

- API build geçti
- API lint geçti
- Web build geçti
- Web lint geçti

Not:

- migration komutu çalıştırılmadı
- partial unique index eklenmesi için generated migration SQL'i senin lokalinde manuel güncellemen gerekiyor

# Bilinçli Olarak Yapılmayanlar

- offers modülüne geçilmedi
- jobs / ratings / notifications açılmadı
- restore / undelete yapılmadı
- admin panel yapılmadı
- global audit log sistemi kurulmadı
- auth mimarisi değiştirilmedi
- cookie / SSR auth açılmadı
- dashboard redesign yapılmadı
- transport request status transition açılmadı
- teklif/job tarafındaki soft delete yan etkileri bu faza alınmadı

# Sonraki Mantıklı Adım

En mantıklı bir sonraki adım:

- generated migration SQL içine active-only partial unique index ekleyip migration'ı uygulamak
- ardından gerçek DB üzerinde vehicles ve transport-requests soft delete senaryolarını tekrar denemek
- sonra transport request durum akışlarını ve teklif bağımlılıklarını ikinci fazda ele almak
