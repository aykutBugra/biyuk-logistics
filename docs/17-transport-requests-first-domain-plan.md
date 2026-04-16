# Transport Requests Ilk Domain Fazı

## Amaç

Bu fazın amacı, auth/users/roles foundation üstüne ilk gerçek domain nesnesini koymaktır. Uygulanan ilk dilim yalnızca musteri tarafında `istek olusturma + kendi isteklerini listeleme + kendi istek detayını gorme` akışını açar.

Bu implementasyonda bilinçli sınırlar korunmuştur:
- vehicles, offers, jobs, ratings ve notifications açılmadı
- harita, autocomplete veya geocoding eklenmedi
- cancel, update, delete ve pagination eklenmedi

## Neden Sıradaki Modül Transport Requests

- Auth ve role altyapısı artık gerçek ownership kuralı taşıyan bir modülü kaldırabilecek seviyedeydi.
- Sistemdeki ilk ticari hareket müşterinin taşıma ihtiyacını oluşturmasıdır.
- `Istek` ve `Durum` tabloları Prisma şemasında zaten vardı; veri zemini hazırdı.
- `apps/api/src/modules/transport-requests` klasörü açılmış ama boştu; ilk gerçek backend halkası için doğal aday buydu.
- Web tarafında `dashboard/istek_ekle` ve `dashboard/isteklerim` placeholder olarak hazır bekliyordu.

## Neden Vehicles ile Başlamıyoruz

- Vehicle modülü nakliyeci hazırlık alanıdır; müşteri isteği olmadan ürünün çekirdek akışını açmaz.
- Register ekranındaki araç alanları bugün gerçek vehicle backend akışına bağlı değildir.
- Vehicle modülünü şimdi çözmek, bu fazın scope'unu gereksiz büyütürdü.
- `Istek` nesnesi açılmadan vehicle tek başına teklif veya iş akışı üretmez.

## Neden Offers / Jobs / Ratings Henüz Başlamıyor

- Offer vermek için önce sistemde bir `Istek` olması gerekir.
- Job/Nakliye için önce istek, sonra kabul edilmiş teklif gerekir.
- Rating için tamamlanmış nakliye gerekir.
- Bu yüzden üçü de `transport-requests` sonrasının bağımlı halkalarıdır.

## Mevcut Altyapıdan Bu Fazda Ne Kullanılacak

Bu implementasyonda aktif olarak kullanılan mevcut altyapı:
- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(ROLE_NAMES.MUSTERI)`
- `@CurrentUser()`
- `PrismaModule` ve `PrismaService`
- global `ValidationPipe`
- mevcut `controller -> service -> repository` ayrımı
- web tarafındaki localStorage tabanlı auth helper

## Veritabanı ve Domain Eşleşmesi

Bu fazın merkezindeki tablolar:

| Tablo | Kullanım |
| --- | --- |
| `Kullanici` | isteğin sahibi müşteri |
| `Istek` | ana domain kaydı |
| `Durum` | başlangıç statüsü |

Bu fazda kullanılmayan ama sonraki bağımlı tablolar:
- `Arac`
- `Teklif`
- `Nakliye`
- `Puanlama`

`Istek` tablosunda aktif kullanılan alanlar:
- `musteriId`
- `baslangicSehri`
- `varisSehri`
- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`
- `yukDetay`
- `olusturmaTarihi`
- `durumId`

Önemli not:
- `Istek` modelinde soft delete alanı yok
- bu yüzden cancel/delete bu faza alınmadı

## İlk Fazın Kapsamı

Uygulanan net kapsam:
- musteri yeni tasima istegi olusturabilir
- musteri kendi isteklerini listeleyebilir
- musteri kendi isteginin detayını gorebilir

Kapsam dışı bırakılan alanlar:
- teklif verme
- açık istek havuzu
- nakliyeci görünümü
- job baslatma
- puanlama
- bildirim
- request update/cancel/delete
- admin read-all

## Önerilen Backend Yapısı

Bu fazda `apps/api/src/modules/transport-requests` altına gerçek feature katmanları eklendi:
- `transport-requests.controller.ts`
- `transport-requests.service.ts`
- `repositories/transport-requests.repository.ts`
- `dto/create-transport-request.dto.ts`
- `dto/transport-request-list-item-response.dto.ts`
- `dto/transport-request-detail-response.dto.ts`

Katman sorumlulukları:
- controller: route ve guard yüzeyi
- service: ownership, role ve status orkestrasyonu
- repository: Prisma sorguları
- dto: request/response sözleşmesi

`AppModule` içine `TransportRequestsModule` bağlandı.

## Önerilen Endpointler

Bu implementasyonda açılan endpointler:

| Endpoint | Rol | Amaç |
| --- | --- | --- |
| `POST /api/v1/transport-requests` | `MUSTERI` | yeni istek oluşturur |
| `GET /api/v1/transport-requests/my` | `MUSTERI` | kendi kayıtlarını listeler |
| `GET /api/v1/transport-requests/:id` | `MUSTERI` | kendi kaydının detayını getirir |

Sözleşme kararları:
- istemciden `musteriId` alınmaz
- istemciden `durumId` alınmaz
- listede yalnızca giriş yapan müşterinin kayıtları döner
- detayda ownership yoksa `404` döner

## DTO / Validation Yaklaşımı

Create DTO alanları:
- `baslangicSehri`
- `varisSehri`
- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`
- `yukDetay`

Validation kuralları:
- şehir alanları trimlenir, boş olamaz, `maxLength(100)`
- yük detayı trimlenir, boş olamaz, `maxLength(500)`
- koordinatlar zorunlu numeric alandır
- enlem `-90..90`
- boylam `-180..180`
- koordinatlarda `maxDecimalPlaces: 6` uygulanır

Response kararı:
- liste cevabında sade alanlar döner
- detay cevabında dört koordinat alanı da döner
- `durum`, istemciye sade string olarak döner

## Rol ve Yetki Kuralları

Bu fazdaki bütün endpointler yalnızca `MUSTERI` rolüne açıktır.

Uygulanan yetki katmanları:
- controller seviyesinde `JwtAuthGuard + RolesGuard + @Roles(ROLE_NAMES.MUSTERI)`
- service seviyesinde tekrar müşteri rolü doğrulaması
- ownership kontrolü repository sorgusunda `id + musteriId`

Hata davranışı:
- auth yoksa `401`
- rol uygun değilse `403`
- dto geçersizse `400`
- kayıt yoksa veya başkasına aitse `404`
- başlangıç status kaydı yoksa `500`

Önemli karar:
- başkasının kaydı istenirse `403` yerine `404` döner

## Durum / Status Yaklaşımı

Başlangıç statüsü şu şekilde kilitlendi:
- `durumTuru = ISTEK`
- `durumAdi = OLUSTURULDU`

Bu seçim neden doğru:
- `OLUSTURULDU`, kaydın henüz sadece oluşturulduğunu söyler
- `ACIK` gibi bir anlam taşımaz
- ileride `YAYINDA`, `TEKLIF_VAR`, `ANLASILDI`, `IPTAL` gibi genişlemelere yer bırakır

Teknik uygulama:
- service, create sırasında bu status kaydını çözüp `durumId` yazar
- numeric `durumId` hardcode edilmez
- runtime auto-seed yoktur
- buna karşılık repo içine idempotent Prisma migration eklendi
- yerel veritabanında bu kayıt ayrıca doğrulandı

Ek not:
- local DB’de bu kayıt yoktu
- idempotent insert uygulanarak `ISTEK / OLUSTURULDU` kaydı eklendi

## Frontend Tarafında Gerekli Minimum Akış

Uygulanan ekranlar:
- `/dashboard/istek_ekle`
- `/dashboard/isteklerim`
- `/dashboard/isteklerim/[id]`

Bu fazda bilinçli olarak kullanılmayan placeholder:
- `/dashboard/acik_istekler`

Minimum UX akışı:
1. auth olmuş musteri `istek_ekle` ekranına gider
2. sehir + koordinat + yuk detayi girer
3. create sonrası detay sayfasına yönlenir
4. `isteklerim` ekranında kendi kayıtlarını görür
5. listeden detaya geçer

Frontend auth davranışı:
- auth yoksa `/login`
- auth var ama `MUSTERI` değilse `/`
- access token `401` verirse local auth temizlenip login’e dönülür

Koordinat kararı:
- backend’de zorunlu kaldı
- frontend’de sade numeric input ile toplandı
- harita/autocomplete eklenmedi

## Bilinçli Olarak Sonraya Bırakılanlar

- vehicles entegrasyonu
- register’daki araç alanlarını gerçek backend akışına bağlamak
- offers
- açık istek havuzu
- nakliyeci görünümü
- jobs/nakliye
- ratings
- notifications
- request update
- request cancel/delete
- soft delete
- pagination
- filter/search
- admin read-all görünümü
- status transition grafiği

## Alternatif Başlangıç Yolları ve Neden Seçilmedi

`vehicles` ile başlamak:
- nakliyeci hazırlığını güçlendirir
- ama ilk iş nesnesini açmaz

`offers` ile başlamak:
- teklif verilecek istek olmadan yapay kalır

`jobs` ile başlamak:
- daha yüksek bağımlılık taşır

`ratings` ile başlamak:
- yaşam döngüsünün en son halkasındadır

Bu yüzden ilk gerçek modül olarak en savunulabilir seçim yine `transport-requests` oldu.

## Uygulama Sırası Önerisi

Bu implementasyonda izlenen sıra:
1. `ISTEK / OLUSTURULDU` status ön koşulu netleştirildi
2. backend modülü controller/service/repository/dto katmanlarıyla açıldı
3. create + my list + detail endpointleri eklendi
4. web tarafında create/list/detail sayfaları bağlandı
5. role ve ownership kuralları müşteri akışı için aktif edildi
6. build/lint ve local DB doğrulaması çalıştırıldı

Kontrol notları:
- `npm run build:api` geçti
- `npm run lint:api` geçti
- `npm run build:web` geçti
- `npm run lint:web` bu faz dışındaki `apps/web/src/app/iletisim/page.tsx` hatası nedeniyle hâlâ geçmiyor

## Toplantıda Kullanılacak Kısa Savunma Metni

Auth foundation tamamlandıktan sonra ilk gerçek domain modülü olarak `transport-requests` açıldı. Çünkü sistemdeki ilk ticari hareket müşterinin taşıma ihtiyacını oluşturmasıdır. `Vehicles` nakliyeci hazırlık alanı olarak daha sonra değer üretir; `offers`, `jobs` ve `ratings` ise zaten bir istek nesnesine bağımlıdır. Bu yüzden en doğru ilk dilim, müşterinin istek oluşturması, kendi isteklerini listelemesi ve kendi isteğinin detayını görmesidir.

Teknik tarafta mevcut mimari korunmuştur: JWT, roles ve ownership altyapısı doğrudan kullanılmış, Prisma tarafındaki `Istek` ve `Durum` tabloları değerlendirilmiş, controller/service/repository ayrımı bozulmamıştır. Frontend tarafında ise scope büyütülmeden yalnızca üç müşteri ekranı açılmış, koordinatlar harita yerine sade numeric input ile toplanmıştır. Böylece proje auth-only temel olmaktan çıkıp ilk gerçek domain nesnesine kavuşmuştur.
