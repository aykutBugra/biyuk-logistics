# Amaç

Bu adımın amacı, nakliyeci tarafında ilk resmi vehicle akışını açmaktır. Register ekranında daha önce görünen araç alanları resmi backend akışı değildi; bu nedenle `vehicles` ayrı bir domain fazı olarak gerçek modüle dönüştürüldü.

# Neden Sıradaki Modül Vehicles

- Müşteri için `transport-requests` akışı artık açıldı.
- Teklif aşamasından önce nakliyecinin sistemde gerçek bir araç kaydı olması daha doğru bir sıralamadır.
- Prisma şemasında `Arac` ve `AracKutuphanesi` zaten hazırdı.
- Backend’de `vehicles` modülü boş iskelet olarak duruyordu; doğal sıradaki aday buydu.
- Web tarafında `arac_ekle` ve `araclarim` placeholder sayfaları ilk resmi giriş noktaları olarak kullanılabildi.

# Neden Offers ile Henüz Başlamıyoruz

- Teklif veren nakliyecinin önce resmi araç kaydı olmalıdır.
- “Hangi araçla teklif verildi?” sorusu offers öncesinde çözülmezse sonraki akış kırılır.
- Bu yüzden `offers`, `vehicles` sonrasına bırakıldı.

# Neden Jobs / Ratings Henüz Başlamıyor

- `jobs/nakliye` için request + offer + kabul gerekir.
- `ratings` için tamamlanmış iş gerekir.
- Bu iki alan, `vehicles` sonrasının bağımlı halkalarıdır.

# Mevcut Altyapıdan Bu Fazda Ne Kullanılacak

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(ROLE_NAMES.NAKLIYECI)`
- `@CurrentUser(maModu)`
- `Prisle` ve `PrismaService`
- mevcut `controller -> service -> repository` ayrımı
- web tarafındaki local auth helper yapısı
- dashboard placeholder sayfaları:
  - `/dashboard/arac_ekle`
  - `/dashboard/araclarim`

# Veritabanı ve Domain Eşleşmesi

Merkez tablolar:

- `Kullanici`
- `Arac`
- `AracKutuphanesi`

`Arac` alanları:

- `id`
- `sahipId`
- `aracKutuphaneId`
- `plaka`
- `yil`
- `kapasite`

`AracKutuphanesi` alanları:

- `id`
- `marka`
- `model`

Önemli sınırlar:

- `Arac` modelinde durum alanı yok
- `Arac` modelinde soft delete yok
- `Arac.plaka` unique
- `kapasite` decimal olarak tutuluyor

# Arac ve AracKutuphanesi Yaklaşımı

İlk fazda kullanıcı doğrudan `aracKutuphaneId` göndermez. Bunun yerine şu alanları girer:

- `marka`
- `model`
- `plaka`
- `yil`
- `kapasite`

Backend davranışı:

- `marka` ve `model` canonical normalize edilir:
  - trim
  - whitespace collapse
  - uppercase
- `AracKutuphanesi` lookup bu canonical `marka + model` ile yapılır
- varsa mevcut kayıt kullanılır
- yoksa yeni kayıt oluşturulur

Bu sayede `Ford Transit`, `ford transit`, `FORD   TRANSIT` gibi tekrarlar ilk fazda engellenir.

# İlk Fazın Kapsamı

Net kapsam:

- nakliyeci araç ekler
- nakliyeci kendi araçlarını listeler
- nakliyeci kendi aracının detayını görür

Kapsam dışı:

- araç update
- araç delete
- aktif/pasif mantığı
- moderasyon/onay
- admin yönetimi
- request ile araç eşleme
- teklif sırasında araç seçme
- job başlatma
- puanlama
- bildirim
- register ile anında araç oluşturma

# Önerilen Backend Yapısı

`apps/api/src/modules/vehicles` altında şu gerçek katmanlar açıldı:

- `vehicles.module.ts`
- `vehicles.controller.ts`
- `vehicles.service.ts`
- `repositories/vehicles.repository.ts`
- `dto/create-vehicle.dto.ts`
- `dto/vehicle-list-item-response.dto.ts`
- `dto/vehicle-detail-response.dto.ts`

Katman sorumlulukları:

- `controller`: route, guard, role, DTO
- `service`: ownership, plaka normalizasyonu, `AracKutuphanesi` çözümü
- `repository`: Prisma erişimi
- `dto`: request/response sözleşmesi

# Önerilen Endpointler

- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles/my`
- `GET /api/v1/vehicles/:id`

Üç endpoint de yalnızca `NAKLIYECI` rolüne açıktır.

Kurallar:

- istemciden `sahipId` alınmaz
- istemciden `aracKutuphaneId` alınmaz
- detail endpoint’te ownership yoksa `404`
- liste yalnızca giriş yapan nakliyecinin kayıtlarını döner

# DTO / Validation Yaklaşımı

Create DTO alanları:

- `marka`
- `model`
- `plaka`
- `yil`
- `kapasite`

Net normalizasyon kararları:

## Plaka

- trim
- uppercase
- iç boşlukları tek boşluğa düşürme

Örnek varyasyonlar:

- `34 abc 123`
- `34ABC123`
- `34   Abc   123`

İlk faz canonical karar:

- boşluklar sadeleştirilir
- plaka normalize edilmiş haliyle storage’a yazılır

## Marka / Model

- trim
- whitespace collapse
- uppercase

## Kapasite

- birim net olarak `ton`
- form label’ı `Kapasite (ton)` olur
- backend storage değeri ton cinsinden decimal kabul edilir

Validation:

- `marka` zorunlu, `maxLength(100)`
- `model` zorunlu, `maxLength(100)`
- `plaka` zorunlu, `maxLength(20)`
- `yil` zorunlu integer, `1900..mevcut yil + 1`
- `kapasite` zorunlu, pozitif decimal, `0 < kapasite <= 1000`

# Rol ve Yetki Kuralları

Kim araç ekleyebilir:

- yalnızca `NAKLIYECI`

Kim kendi araçlarını görebilir:

- yalnızca `NAKLIYECI`
- yalnızca `sahipId = currentUser.id`

Kim araç detayını görebilir:

- yalnızca `NAKLIYECI`
- yalnızca kendi aracı
- başkasının aracı için `404`

Hata davranışları:

- `400` invalid DTO
- `401` auth yok
- `403` wrong role
- `404` own olmayan veya olmayan araç
- `409` duplicate plaka

# Frontend Tarafında Gerekli Minimum Akış

Gerekli ekranlar:

- `/dashboard/arac_ekle`
- `/dashboard/araclarim`
- `/dashboard/araclarim/[id]`

Minimum UX:

1. auth olmuş `NAKLIYECI` kullanıcı araç ekleme ekranına gider
2. marka, model, plaka, yıl ve kapasite girer
3. create başarılıysa detail sayfasına gider
4. `araclarim` ekranında kendi araçlarını görür
5. listeden detail’e geçer

Auth davranışı:

- auth yoksa `/login`
- auth var ama `NAKLIYECI` değilse `/`
- `401` API cevabında local auth temizlenip `/login`
- `403` API cevabında `/`
- detail `404` için inline `Bu arac bulunamadi` mesajı

Minimum görünür giriş:

- ana sayfada role-aware CTA
  - `Arac Ekle`
  - `Araclarim`
- dashboard içinde yerel sol shell/menu

# Bilinçli Olarak Sonraya Bırakılanlar

- update/delete
- aktif/pasif mantığı
- moderasyon/onay
- admin araç yönetimi
- `AracKutuphanesi` ayrı CRUD ekranı
- offers
- jobs/nakliye
- ratings
- notifications
- request-vehicle eşleme
- register araç alanlarını gerçek backend’e bağlama
- gelişmiş search/filter/pagination

# Alternatif Başlangıç Yolları ve Neden Seçilmedi

`offers` ile başlamak:

- araç kaydı oturmadan teklif nesnesi eksik bağlamla doğar

`jobs` ile başlamak:

- request + offer + vehicle seçimi ön koşullarına bağımlıdır

`ratings` ile başlamak:

- tamamlanmış iş gerektirir

Bu yüzden `vehicles`, `offers` öncesi daha mantıklıdır.

# Uygulama Sırası Önerisi

1. `vehicles` ilk fazı `create + my list + detail` olarak kilitlendi
2. backend modülü gerçek katmanlarla dolduruldu
3. plaka canonical normalizasyonu eklendi
4. marka/model canonical normalizasyonu eklendi
5. `AracKutuphanesi` lookup-or-create akışı service içinde kuruldu
6. web tarafında create/list/detail ekranları açıldı
7. ana sayfada nakliyeci CTA girişleri eklendi

# Toplantıda Kullanılacak Kısa Savunma Metni

Müşteri tarafında `transport-requests` ilk resmi akış olarak açıldıktan sonra sıradaki doğru domain halkası `vehicles` oldu. Çünkü teklif vermek için yalnızca talep nesnesi yetmez; nakliyeci tarafında da sistemde tanımlı, sahipliği net ve ileride operasyonel olarak kullanılabilecek resmi bir araç kaydı gerekir.

Bu faz bilinçli olarak dar tutuldu. İlk resmi dilim yalnızca araç ekleme, kendi araçlarını listeleme ve kendi aracının detayını görme kapsamındadır. `AracKutuphanesi` şemadaki zorunlu ilişki olarak korunur ama kullanıcıya ayrı katalog yönetimi açılmaz; backend marka/modeli canonical normalize edip mevcut kaydı kullanır veya yeni kayıt oluşturur. Böylece teklif öncesi nakliyeci tarafı ilk gerçek domain nesnesine kavuşur.
