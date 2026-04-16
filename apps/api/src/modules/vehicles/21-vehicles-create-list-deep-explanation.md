# Amaç

Bu raporun amacı, projedeki mevcut `vehicles` implementasyonunu özellikle iki akış üzerinden öğretici biçimde çözmektir:

1. Araç ekleme
2. Giriş yapan nakliyecinin kendi araçlarını listelemesi

Bu belge yeni kod önermek, refactor yapmak veya olmayan bir özelliği olmuş gibi göstermek için yazılmadı. Buradaki tüm açıklamalar repo içindeki mevcut dosyalara, mevcut endpoint'lere ve mevcut veri modeline dayanır.

Ana odak `POST /api/v1/vehicles` ve `GET /api/v1/vehicles/my` akışlarıdır. `GET /api/v1/vehicles/:id` akışı sistemin düşünme biçimini anlamak için kısa bir tamamlayıcı örnek olarak değinilir; çünkü araç ekleme başarılı olunca frontend kullanıcıyı detail sayfasına yönlendirir.

# Bu Modül Projede Neyi Çözüyor

`vehicles` modülü, nakliyeci tarafında ilk resmi araç kaydı alanını açar. Bunun çözdüğü ihtiyaç basittir ama önemlidir: sistemde sadece kullanıcı hesabı olması yetmez, nakliyeci tarafında operasyonel olarak kullanılabilecek gerçek bir araç nesnesi de gerekir.

Bu modülün çözdüğü ana problemler şunlardır:

- Nakliyecinin sistemde resmi bir araç kaydı oluşturabilmesi
- Oluşturduğu araçların sadece kendisine ait olarak tutulması
- Araç bilgisinin kullanıcı hesabından ayrı, domain nesnesi olarak yaşaması
- Marka ve model bilgisinin tekrar tekrar serbest metin olarak dağılmaması
- Gelecekte teklif, taşıma ve araç seçimi gibi akışların üzerinde durabileceği bir temel oluşması

Buradaki önemli nokta şudur: register ekranında nakliyeci için bazı araç alanları görünse bile bunlar resmi vehicle akışının yerine geçmez. Mevcut repo koduna göre register payload'ı araç alanlarını backend'e göndermez. Yani araç kaydı, bilinçli olarak `vehicles` modülünde ayrı bir faz olarak açılmıştır.

# Genel Mimari İçindeki Yeri

Bu proje pratik olarak modüler monolith yaklaşımıyla ilerliyor:

- Backend tarafında NestJS modülleri var
- Frontend tarafında Next.js `app` router ile sayfa bazlı akışlar var
- İkisi aynı repo içinde gelişiyor

`vehicles` modülünün genel mimarideki yeri birkaç nedenle önemlidir.

İlk neden sıralama meselesidir. `transport-requests` müşteri tarafında ilk resmi domain akışını açtıktan sonra, taşımanın diğer tarafı olan nakliyeci için doğal sıradaki nesne araçtır. Faz notlarında da bu sıra açık biçimde korunmuş:

- Önce müşteri bir talep oluşturabiliyor
- Sonra nakliyeci tarafında resmi araç kaydı oluşuyor
- Daha sonra offer, job ve rating gibi daha ileri akışlar bu iki temel nesne üstüne kurulabiliyor

İkinci neden bağımlılık ilişkisidir. Teklif vermek veya işi üstlenmek gibi akışlar, “hangi araçla bu iş yapılacak?” sorusuna eninde sonunda dayanır. Araç kaydı yoksa sonraki adımların modeli eksik kalır.

Üçüncü neden backend ve frontend'in birlikte ele alınmasıdır. Bu özellik sadece API olarak yazılmış olsaydı kullanıcı tarafından erişilemez kalacaktı. Sadece UI olarak yazılmış olsaydı da kalıcı veri üretmeyecekti. Bu yüzden `vehicles` ilk fazı, uçtan uca çalışan bir dilim olarak düşünülmüş:

- backend endpoint'leri var
- frontend sayfaları var
- auth/role kısıtları var
- create sonrası list/detail gezinmesi var

Bu da modülün neden tek başına teknik bir sınıf koleksiyonu değil, tam bir ürün dilimi olarak ele alındığını gösteriyor.

# Backend Tarafında Kullanılan Dosyalar

Araç ekleme ve listeleme akışı backend'de tek bir dosyaya değil, birkaç katmana dağılmış durumda. Bu dağılım rastgele değil; her katmanın ayrı sorumluluğu var.

## Doğrudan vehicles modülü dosyaları

- `apps/api/src/modules/vehicles/vehicles.module.ts`
- `apps/api/src/modules/vehicles/vehicles.controller.ts`
- `apps/api/src/modules/vehicles/vehicles.service.ts`
- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`
- `apps/api/src/modules/vehicles/dto/create-vehicle.dto.ts`
- `apps/api/src/modules/vehicles/dto/vehicle-list-item-response.dto.ts`
- `apps/api/src/modules/vehicles/dto/vehicle-detail-response.dto.ts`

## Modülü uygulamaya bağlayan dosyalar

- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`

## Veritabanı ve Prisma katmanı

- `apps/api/prisma/schema.prisma`
- `apps/api/src/infrastructure/prisma/prisma.module.ts`
- `apps/api/src/infrastructure/prisma/prisma.service.ts`

## Auth ve role desteği sağlayan dosyalar

- `apps/api/src/common/constants/role-names.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/common/decorators/roles.decorator.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/types/authenticated-user.type.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/jwt.strategy.ts`

## Bu dosyalar backend'de birlikte ne yapıyor?

Backend akışını yüksek seviyede şöyle düşünebilirsin:

1. `main.ts` global API prefix'i ve validation davranışını tanımlar.
2. `AppModule`, `VehiclesModule`'ü uygulamaya dahil eder.
3. `VehiclesController`, gelen HTTP isteğini karşılar.
4. `JwtAuthGuard` token'dan kullanıcıyı çözer.
5. `RolesGuard` kullanıcının gerekli role sahip olup olmadığını kontrol eder.
6. `@CurrentUser()` request içindeki authenticated user bilgisini controller method'una taşır.
7. `VehiclesService`, business rule'ları uygular.
8. `VehiclesRepository`, Prisma üzerinden veritabanı işlemini yapar.
9. DTO'lar gelen ve dönen verinin sözleşmesini netleştirir.

## Neden controller / service / repository / dto ayrımı kullanıldı?

Bu ayrım mevcut modülde çok bilinçli:

- `controller` HTTP katmanıdır. Route, guard, decorator ve request/response tipi burada görünür.
- `service` iş kuralı katmanıdır. Rol doğrulama, marka/model çözümü, plaka normalize etme, duplicate hata çevirme gibi kararlar burada.
- `repository` veri erişim katmanıdır. Prisma sorguları burada tutulur.
- `dto` API sözleşmesini taşır. Hangi alanın isteneceği ve hangi shape'in döneceği burada netleşir.

Bu sayede controller ince kalır, Prisma controller'a sızmaz, business rule'lar da SQL/ORM sorgusuna gömülmez.

## Vehicles modülü AppModule'a nasıl bağlandı?

`apps/api/src/app.module.ts` içinde `VehiclesModule`, `imports` listesine eklenmiş durumda. Bu önemli, çünkü Nest'te bir modül yalnızca tanımlandığı için çalışmaz; uygulamanın kök modülü içine dahil edilmesi gerekir. Bu bağlantı kurulmasa endpoint'ler hiç ayağa kalkmazdı.

## Request hangi endpoint'e geliyor?

Mevcut backend prefix ve controller tanımına göre ilgili endpoint'ler şunlar:

- `POST /api/v1/vehicles`
- `GET /api/v1/vehicles/my`
- `GET /api/v1/vehicles/:id`

`main.ts` içindeki `app.setGlobalPrefix("api/v1")` tüm route'lara `/api/v1` ön ekini verir. `VehiclesController` üzerindeki `@Controller("vehicles")` ise modülün temel yolunu belirler.

## Guard / role kontrolü nasıl çalışıyor?

Bu modülde controller seviyesinde şu kombinasyon kullanılıyor:

- `@UseGuards(JwtAuthGuard, RolesGuard)`
- `@Roles(ROLE_NAMES.NAKLIYECI)`

Sıra şu şekilde işler:

1. `JwtAuthGuard`, bearer token'ı Passport JWT stratejisine teslim eder.
2. `JwtStrategy`, token payload'ını `AuthenticatedUser` şekline çevirir.
3. Bu bilgi `request.user` içine konur.
4. `RolesGuard`, `@Roles(...)` metadata'sını okur.
5. `request.user.roles` içinde `NAKLIYECI` var mı diye bakar.
6. Yoksa `403`, auth yoksa `401` döner.

Service içinde ayrıca `assertCarrierRole` ile ikinci bir koruma daha var. Bu tekrar gibi görünebilir ama savunmacı tasarım açısından anlamlıdır. Böylece service başka bir yerden guard'sız çağrılsa bile business rule korunur.

## Current user nasıl alınıyor?

Akış şu zincirle çalışır:

- `JwtStrategy.validate(...)` token payload'ını `AuthenticatedUser` objesine çevirir
- Passport bunu `request.user` içine yazar
- `CurrentUser` decorator'ı `ExecutionContext` içinden `request.user` okur
- Controller method'u kullanıcıyı doğrudan parametre olarak alır

Bu yüzden controller içinde token parse etme, header okuma veya kullanıcı id'sini elle çözme kodu yok.

## SahipId neden body'den alınmıyor?

Çünkü `sahipId` istemcinin güvenilir şekilde belirleyebileceği bir veri değil. Eğer body'den alınsaydı, kötü niyetli bir istemci başka bir kullanıcı adına araç oluşturmayı deneyebilirdi.

Mevcut tasarımda sahiplik sunucu tarafından belirlenir:

- frontend sadece araç alanlarını gönderir
- backend authenticated current user'ı çözer
- `VehiclesService.create(...)` çağrısında `sahipId` olarak `currentUser.id` kullanılır

Bu, ownership bilgisini tek kaynağa indirir.

## Marka/model neden service tarafında çözülüyor?

Marka ve modelin `AracKutuphanesi` içinde bulunması veya yeni kayıt oluşturulması, salt veri erişimi değil business orchestration işidir. Çünkü burada birden fazla adım vardır:

- input normalize edilir
- mevcut kayıt lookup edilir
- yoksa yeni library satırı oluşturulur
- çıkan id gerçek araca bağlanır

Bu karar repository içinde olsaydı, repository hem sorgu hem iş kuralı hem de orchestration sorumluluğunu üstlenmiş olurdu. Controller'da olsaydı HTTP katmanı gereğinden fazla kalınlaşırdı. Bu yüzden en doğru yer service katmanıdır.

## AracKutuphanesi neden var?

`schema.prisma` içinde `Arac` ile `AracKutuphanesi` ayrı modellerdir:

- `AracKutuphanesi`: marka + model tanımını tutar
- `Arac`: gerçek kullanıcı aracını tutar ve `aracKutuphaneId` ile kütüphane kaydına bağlanır

Bu ayrımın mevcut faydaları:

- marka/model bilgisi ayrı bir domain parçası olarak tutulur
- birden fazla gerçek araç aynı marka/model tanımını paylaşabilir
- `Arac` tablosu aynı serbest metinleri tekrar tekrar taşımak yerine ilişki kurar
- gelecekte araç katalog mantığını genişletmek daha kolay olur

## Plaka normalize etme neden gerekli?

Plaka kullanıcı tarafından serbest metin olarak girilir. Bu da şu problemlere yol açabilir:

- başta/sonda gereksiz boşluk
- birden fazla boşluk
- küçük/büyük harf farkı

`VehiclesService` içindeki `normalizeVehiclePlate`, şu an için şu dönüşümü yapar:

- `trim`
- birden fazla boşluğu teke düşürme
- `uppercase`

Bu sayede aynı plakanın sadece yazım biçimi kaynaklı bazı tutarsızlıkları temizlenir ve storage daha tutarlı hale gelir.

Burada önemli nüans şudur: mevcut kod iç boşlukları tamamen kaldırmıyor, sadece sadeleştiriyor. Yani `34 ABC 123` ile `34ABC123` aynı değere çevrilmiyor. Raporda bunu olduğundan fazla genellememek gerekir.

## Duplicate plaka kontrolü nerede ve neden var?

Duplicate plaka için iki seviyeli bir koruma var:

1. Asıl otorite veritabanı
2. HTTP anlamlandırması service katmanı

`schema.prisma` içinde `Arac.plaka` alanı `@unique`. Yani son sözü veritabanı söyler. Bu doğrudur, çünkü yarış koşullarında uygulama kodu değil DB constraint güvenilir garantidir.

`VehiclesService.create(...)` içindeki `try/catch` ise Prisma'nın `P2002` unique constraint hatasını yakalar ve bunu daha anlamlı bir `409 Conflict` cevabına çevirir:

- hedef alan `plaka` ise `Vehicle plate is already in use.`
- başka unique conflict ise daha genel bir conflict mesajı

Bu yüzden duplicate kontrolü “repository'de if ile önceden bakılıp sonra create etme” şeklinde değil, DB unique constraint + service-level hata çevirisi şeklinde kurulmuştur.

## Listeleme sorgusu neden sadece current user'a ait kayıtları döndürüyor?

Çünkü bu ekranın amacı genel araç kataloğu değil, “benim araçlarım” görünümüdür. Bu karar hem ürün hem güvenlik açısından önemlidir:

- kullanıcı başkasının araçlarını görmez
- frontend tarafındaki `/dashboard/araclarim` ismi ile backend davranışı tutarlı olur
- sonraki sahiplik kuralları için temel atılır

Repository'de bu doğrudan sorguya gömülmüştür:

- listede `findManyByOwnerId(sahipId)`
- detail'de `findByIdAndOwnerId(id, sahipId)`

Yani ownership kontrolü yalnızca UI etiketiyle değil, veri sorgusuyla da korunur.

## Response DTO neden ayrı tutuluyor?

`VehicleListItemResponseDto` ile `VehicleDetailResponseDto` şu an aynı alanları taşıyor. Buna rağmen ayrı tutulmaları bilinçli bir API tasarımı kararıdır.

Bunun nedeni:

- liste ile detail sözleşmesini kavramsal olarak ayırmak
- ileride detail büyürse list endpoint'ini kırmadan geliştirebilmek
- DB entity'sini doğrudan response gibi kullanmamak

Bugün şekiller aynı olabilir; ama bu aynı kalacakları anlamına gelmez. Ayrı DTO tutulması ileride genişleme alanı açar.

# Frontend Tarafında Kullanılan Dosyalar

Frontend tarafında araç create ve my list akışı birkaç ortak yardımcı etrafında dönüyor.

## Doğrudan ekran dosyaları

- `apps/web/src/app/dashboard/arac_ekle/page.tsx`
- `apps/web/src/app/dashboard/araclarim/page.tsx`
- `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

## API ve auth yardımcıları

- `apps/web/src/lib/api/vehicles.ts`
- `apps/web/src/lib/api/api-client.ts`
- `apps/web/src/lib/auth/auth-storage.ts`
- `apps/web/src/lib/auth/use-carrier-page-access.ts`

## Ortak UI bileşenleri

- `apps/web/src/components/CarrierVehiclesShell.tsx`
- `apps/web/src/components/InputField.tsx`
- `apps/web/src/components/HomeCustomerActions.tsx`

## Destekleyici bağlam dosyaları

- `apps/web/src/app/register/page.tsx`
- `docs/20-vehicles-first-flow-plan.md`

## Neden `/dashboard/arac_ekle` ve `/dashboard/araclarim` seçildi?

Bu iki yol projenin mevcut Türkçe dashboard URL yaklaşımına uyuyor. Zaten repo içinde benzer sayfa isimleri de Türkçe:

- `/dashboard/istek_ekle`
- `/dashboard/isteklerim`
- `/dashboard/tekliflerim`

Bu yüzden araç tarafında da aynı dil ve routing mantığı korunmuş:

- `arac_ekle` doğrudan create aksiyonunu temsil eder
- `araclarim` doğrudan ownership bazlı listeyi temsil eder

Ayrıca ikisi farklı kullanıcı niyetlerini ayırır:

- biri veri üretme ekranı
- diğeri mevcut veriyi görme ekranı

Bu ayırım UX'i sadeleştirir.

## Auth helper nasıl kullanılıyor?

Frontend auth akışı local storage tabanlı:

- `auth-storage.ts` token ve user bilgisini localStorage'da saklar
- `useCarrierPageAccess.ts` bu storage'ı okuyup role kontrolü yapar
- page component'leri bu hook'tan `accessToken` ve `status` alır

Yani sayfalar auth mekanizmasını yeniden yazmaz; ortak hook'u kullanır.

## Neden page-level access kontrolü yapılıyor?

Mevcut implementasyonda auth bilgisi browser tarafındaki local storage'dan geliyor. Bu yüzden sayfa erişimi de client tarafında çözülüyor. `useCarrierPageAccess` tam bu işi yapıyor:

- auth henüz okunmadıysa `checking`
- auth yoksa `/login` redirect
- role uygun değilse `/` redirect
- uygunsa `ready`

Bu yaklaşım özellikle bu projedeki mevcut yapı için mantıklı, çünkü:

- global middleware kurgusu yok
- shared dashboard layout üzerinde merkezi gate yok
- feature doğrudan client component sayfalarıyla ilerliyor

## Form nasıl çalışıyor?

`/dashboard/arac_ekle/page.tsx` içinde form tamamen local component state ile tutuluyor:

- `useState` ile form alanları saklanıyor
- `handleChange` input isimlerine göre state güncelliyor
- submit sırasında `yil` ve `kapasite` string'den number'a çevrilip API payload'ı hazırlanıyor

HTML tarafındaki input'lar da mevcut backend DTO ile uyumlu alanları gösteriyor:

- marka
- model
- plaka
- yil
- kapasite

## Submit sonrası ne oluyor?

Başarılı create sonrasında sayfa list ekranına değil, detail ekranına yönlendiriyor:

- `createVehicle(...)` response içinden `id` geliyor
- `router.replace(\`/dashboard/araclarim/\${response.id}\`)` çağrılıyor

Bu karar önemli, çünkü kullanıcıya “oluşturduğun kayıt budur” şeklinde en doğrudan geri bildirimi detail ekranı verir.

## Liste ekranı hangi helper ile veri çekiyor?

`/dashboard/araclarim/page.tsx`, veri çekmek için `getMyVehicles(accessToken)` helper'ını kullanıyor. Bu helper `apps/web/src/lib/api/vehicles.ts` içinde duruyor ve altında ortak `apiFetch` çağrısını kullanıyor.

Yani sayfa doğrudan `fetch(...)` yazmıyor; feature bazlı API helper'a gidiyor.

## Neden ortak shell / sol menü kullanıldı?

`CarrierVehiclesShell` üç sayfada da aynı alanı kuruyor:

- araç ekleme
- araçlarım listesi
- araç detail

Bunun faydaları:

- feature içi gezinme aynı kalır
- create/list/detail aynı panelin parçaları gibi hissedilir
- aktif menü mantığı tek yerde çözülür
- her sayfada aynı başlık ve yan menü tekrarlanmaz

Ayrıca shell içindeki `isActiveNavItem(...)` fonksiyonu detail route'larını da `araclarim` altında aktif sayacak şekilde yazılmış. Bu küçük ama önemli bir UX kararıdır.

## Token nasıl gönderiliyor?

Token zinciri şu şekilde:

1. `auth-storage` localStorage'dan auth objesini okur
2. `useCarrierPageAccess` access token'ı sayfaya verir
3. Sayfa `vehicles.ts` helper'ına token'ı parametre olarak geçirir
4. `vehicles.ts`, token'ı `apiFetch` içine iletir
5. `apiFetch`, request header'ına `Authorization: Bearer <token>` ekler

Bu yüzden token gönderme sorumluluğu sayfa içinde dağınık halde değildir.

## Hata, loading, empty state nasıl ele alınıyor?

Create ekranı:

- `status !== "ready"` ise tam ekran loading gösterir
- submit sırasında buton disabled olur
- hata durumunda `window.alert(...)` kullanılır
- `401` gelirse auth temizlenir ve login'e atılır
- `403` gelirse ana sayfaya atılır

Liste ekranı:

- `isLoading` ile yüklenme durumu gösterilir
- `errorMessage` ile hata kutusu basılır
- sonuç boşsa empty state kartı gösterilir
- empty state içinden “İlk aracı ekle” CTA'sı verilir

Detail ekranı:

- yüklenme kartı vardır
- `404` için özel mesaj vardır
- create akışının ardından kullanıcıyı doğru kayda götürür

# Araç Ekleme Akışının Uçtan Uca Çalışması

Bu akışı en iyi, kullanıcı tıklamasından veritabanına kadar zincir halinde okumakla anlayabilirsin.

## 1. Kullanıcı ekranı açar

Kullanıcı `/dashboard/arac_ekle` sayfasına gider. Sayfa açılır açılmaz `useCarrierPageAccess()` çalışır.

Bu hook:

- local storage'dan auth bilgisini okur
- kullanıcı yoksa `/login`'e yönlendirir
- kullanıcı var ama `NAKLIYECI` değilse `/` sayfasına yönlendirir
- uygunsa token'ı sayfaya verir

Bu nedenle create ekranı sadece görünüşte değil, davranışta da rol bazlıdır.

## 2. Kullanıcı formu doldurur

Sayfa içinde form state'i şu alanlardan oluşur:

- `marka`
- `model`
- `plaka`
- `yil`
- `kapasite`

Input'lar `InputField` bileşeni ile çizilir ama verinin sahibi sayfanın kendisidir. `handleChange`, input `name` değerine bakarak ilgili state alanını günceller.

## 3. Submit anında frontend payload üretir

Form submit edildiğinde:

- default HTML submit davranışı durdurulur
- tekrar submit'i önlemek için `isSubmitting` kontrol edilir
- token yoksa işlem kesilir

Ardından frontend şu payload'ı hazırlar:

- `marka`: string
- `model`: string
- `plaka`: string
- `yil`: `Number(form.yil)`
- `kapasite`: `Number(form.kapasite)`

Buradaki önemli nokta: HTML input değerleri doğal olarak string gelir. Frontend bunu number'a çevirir; backend de yine DTO tarafında `transform` ile kendini korur.

## 4. Frontend hangi fonksiyonu çağırır?

Sayfa `createVehicle(payload, accessToken)` fonksiyonunu çağırır. Bu helper `apps/web/src/lib/api/vehicles.ts` içindedir.

Bu helper şunu yapar:

- `apiFetch("/vehicles", { method: "POST", accessToken, body: JSON.stringify(input) })`

Yani feature helper path ve HTTP method bilgisini sabitler.

## 5. Request hangi endpoint'e gider?

`api-client.ts` içindeki base URL ile birlikte istek şu endpoint'e gider:

- `POST /api/v1/vehicles`

`apiFetch`, header'a:

- `Content-Type: application/json`
- `Authorization: Bearer <token>`

ekler ve `cache: "no-store"` kullanır.

## 6. Backend controller ne yapar?

`VehiclesController.create(...)` method'u şu işi yapar:

- önce guard zinciri çalışır
- `@CurrentUser()` ile authenticated user alınır
- `@Body()` ile `CreateVehicleDto` alınır
- request doğrudan service'e gönderilir

Controller burada business rule çözmez. Sadece HTTP giriş kapısıdır.

## 7. DTO validation ne yapar?

`CreateVehicleDto` global `ValidationPipe` sayesinde devreye girer. `main.ts` içindeki pipe ayarları şunları sağlar:

- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

Bu, create akışında kritik:

- tanımlı olmayan alanlar kabul edilmez
- `yil` ve `kapasite` string gelse bile sayıya çevrilmeye çalışılır
- `marka`, `model`, `plaka` trim + whitespace collapse ile normalize edilir

DTO seviyesinde yapılan iş business rule'ın tamamı değildir; ama request'i temizlemek için ilk kapıdır.

## 8. Service ne yapar?

`VehiclesService.create(...)` akışın asıl beyni:

1. `assertCarrierRole(currentUser)` ile rolü tekrar doğrular
2. `marka` ve `model` için canonical text normalize eder
3. `plaka`yı normalize eder
4. `resolveVehicleLibraryId(marka, model)` çağırır
5. çıkan `aracKutuphaneId` ile repository `create(...)` çağrısı yapar
6. `sahipId` olarak body'yi değil `currentUser.id`'yi kullanır
7. unique plate hatası gelirse bunu `409 Conflict` olarak yeniden anlamlandırır
8. sonucu `VehicleDetailResponseDto` shape'ine map eder

Burada özellikle iki karar önemlidir:

- sahiplik bilgisi sunucuda belirlenir
- marka/model çözümü service katmanında yürütülür

## 9. AracKutuphanesi burada nasıl devreye girer?

`resolveVehicleLibraryId(...)` şu mantıkla çalışır:

- repository üzerinden marka + model ile mevcut library kaydını arar
- varsa o id'yi döner
- yoksa yeni `AracKutuphanesi` kaydı açar ve yeni id'yi döner

Yani create akışında veritabanına her zaman iki tablo yazılmaz:

- eğer marka/model mevcutsa sadece `Arac`
- yoksa önce `AracKutuphanesi`, sonra `Arac`

## 10. Repository ne yapar?

`VehiclesRepository.create(...)` Prisma üzerinden gerçek insert işlemini yapar:

- `sahipId`
- `aracKutuphaneId`
- `plaka`
- `yil`
- `kapasite`

`kapasite`, Prisma Decimal alanı olduğu için `new Prisma.Decimal(input.kapasite)` ile yazılır.

Sorgu sonrası `vehicleSelect` ile seçilen alanlar okunur:

- `Arac` tablosundan temel alanlar
- ilişkili `aracBilgisi` içinden `marka` ve `model`

Ardından repository sonucu düzleştirir ve service'e şu shape'i verir:

- `id`
- `plaka`
- `marka`
- `model`
- `yil`
- `kapasite`

## 11. DB'ye ne yazılır?

Create akışında aşağıdaki kayıtlar yazılır:

- Her zaman: `Arac` tablosuna bir yeni satır
- Gerektiğinde: `AracKutuphanesi` tablosuna bir yeni satır

`Arac` içine doğrudan `marka` ve `model` yazılmaz. Bunun yerine `aracKutuphaneId` yazılır. Bu, veri modelinin bilinçli tercihidir.

## 12. Response nasıl geri döner?

Repository sonucu service'e döner, service bunu `VehicleDetailResponseDto` biçimine çevirir, controller da bunu HTTP response olarak geri verir.

Şu an detail DTO ile list DTO aynı alanlara sahip:

- `id`
- `plaka`
- `marka`
- `model`
- `yil`
- `kapasite`

## 13. Frontend bu cevabı nasıl kullanır?

Create ekranı response içindeki `id` değerini kullanarak kullanıcıyı detail sayfasına taşır:

- `router.replace(/dashboard/araclarim/:id)`

Bu yüzden create akışı pratikte şöyle tamamlanır:

- form doldu
- create API çağrıldı
- araç kaydedildi
- kullanıcı yeni oluşturulan kaydın detail ekranına gitti

Detail ekranı ana odak değildir, ama create sonrası akışın nereye bağlandığını anlamak için önemlidir.

# Araç Listeleme Akışının Uçtan Uca Çalışması

Listeleme akışı create kadar çok adımlı görünmese de, güvenlik ve sahiplik açısından çok şey anlatır.

## 1. Kullanıcı liste ekranını açar

Kullanıcı `/dashboard/araclarim` sayfasına gider. Sayfa yine `useCarrierPageAccess()` çağırır.

Bu sayede:

- token yoksa sayfa login'e atar
- role yanlışsa ana sayfaya atar
- yalnızca uygun kullanıcı veri çekme aşamasına geçer

## 2. Sayfa veri çekmeyi ne zaman başlatır?

`useEffect(...)`, ancak şu koşul sağlanınca gerçek request'i başlatır:

- `status === "ready"`
- `accessToken` mevcut

Bu kontrol önemlidir, çünkü auth snapshot henüz çözülmeden boş token'la request atılmasını engeller.

## 3. Frontend hangi helper ile çağrı yapar?

Sayfa `getMyVehicles(accessToken)` helper'ını çağırır. Bu helper `vehicles.ts` içinde şu endpoint'e gider:

- `GET /vehicles/my`

`apiFetch` yine aynı şekilde bearer token header'ı ekler.

## 4. Controller ne yapar?

`VehiclesController.getMine(...)` method'u:

- `@CurrentUser()` ile authenticated user'ı alır
- service üzerindeki `getMine(currentUser)` metodunu çağırır

Burada ayrıca body veya query parametresi yoktur. Çünkü bu endpoint “benim araçlarım” endpoint'idir; kullanıcı kimliği URL'den veya query'den değil auth context'ten gelir.

## 5. Service ne yapar?

`VehiclesService.getMine(...)` şu işi yapar:

- rolü tekrar `assertCarrierRole(...)` ile doğrular
- repository'den `findManyByOwnerId(currentUser.id)` çağrısını yapar
- dönen kayıtları `VehicleListItemResponseDto[]` dizisine map eder

Buradaki kritik ürün kararı ownership filtresidir. Bu method tüm araçları değil, sadece current user'a ait araçları ister.

## 6. Repository ne yapar?

`VehiclesRepository.findManyByOwnerId(sahipId)` Prisma sorgusunu şöyle kurar:

- `where: { sahipId }`
- `orderBy: [{ id: "desc" }]`
- `select: vehicleSelect`

Yani liste:

- sadece ilgili kullanıcıya ait satırları döner
- yeni kayıtlar üstte olacak şekilde sıralanır
- relation üzerinden marka/model'i de beraber çeker

## 7. Response nasıl dönüyor?

Repository düzleştirilmiş `StoredVehicleRecord[]` döndürür. Service bunu liste DTO dizisine çevirir. Controller da JSON response olarak geri verir.

Bu response frontend için doğrudan kart çizilebilecek kadar temizdir:

- plaka
- marka
- model
- yil
- kapasite

## 8. Frontend response'u nasıl kullanıyor?

Liste ekranı response'u aldıktan sonra:

- `setVehicles(response)` ile state'e yazar
- loading flag'ini kapatır
- sonra koşullu render'a bırakır

Render dalları şunlardır:

- yükleniyorsa loading kartı
- hata varsa error kartı
- sonuç boşsa empty state + “İlk aracı ekle” linki
- veri varsa her araç için linklenen kart listesi

## 9. Kart tıklanınca ne oluyor?

Her kartın link'i detail ekranına gider:

- `/dashboard/araclarim/${vehicle.id}`

Bu detail sayfası da yine aynı ownership ve auth mantığını korur. Dolayısıyla listede görülen her satır detail'e taşınabilir, ama başka kullanıcıya ait bir id ile erişim denenirse backend `404` döner.

# Dosya Dosya Açıklama

Bu bölümde ilgili dosyaları tek tek açıklıyorum. Her dosya için dört soruya cevap veriyorum:

- Bu dosya ne işe yarıyor?
- Neden gerekli?
- Buradaki kritik karar ne?
- Bu dosya olmasa ne bozulurdu?

## Backend dosyaları

### `apps/api/src/app.module.ts`

- Ne işe yarıyor? Uygulamanın kök modülüdür; `VehiclesModule` dahil tüm feature modüllerini bir araya getirir.
- Neden gerekli? `VehiclesModule` burada import edilmezse `/api/v1/vehicles` endpoint'leri ayağa kalkmaz.
- Kritik karar ne? Vehicles'ı ayrı bir modül olarak kök modüle bağlamak.
- Bu dosya olmasa ne bozulurdu? Nest uygulaması feature modüllerini yükleyemezdi.

### `apps/api/src/main.ts`

- Ne işe yarıyor? Nest uygulamasını başlatır, global prefix ve validation davranışını kurar.
- Neden gerekli? `CreateVehicleDto` validasyonu ve `/api/v1` endpoint yolu burada aktif hale gelir.
- Kritik karar ne? `ValidationPipe` içinde `transform`, `whitelist`, `forbidNonWhitelisted` kullanılması.
- Bu dosya olmasa ne bozulurdu? Request'ler tutarlı biçimde validate edilmez, route prefix'leri dağılırdı.

### `apps/api/prisma/schema.prisma`

- Ne işe yarıyor? `Arac`, `AracKutuphanesi`, `Kullanici`, `Rol` gibi veri modellerini tanımlar.
- Neden gerekli? Vehicles modülünün gerçek veri yapısı burada belirlenir.
- Kritik karar ne? `Arac.plaka` alanını unique yapmak ve `Arac` ile `AracKutuphanesi` arasında relation kurmak.
- Bu dosya olmasa ne bozulurdu? Repository'nin üstüne kurulduğu veri modeli ve Prisma client tipi olmazdı.

### `apps/api/src/infrastructure/prisma/prisma.module.ts`

- Ne işe yarıyor? `PrismaService`'i global provider olarak sunar.
- Neden gerekli? Repository'lerin Prisma erişimini ortak bir yerden almasını sağlar.
- Kritik karar ne? `@Global()` ile tüm modüllerin tekrar tekrar import etmeden Prisma'ya erişebilmesi.
- Bu dosya olmasa ne bozulurdu? Repository katmanı veritabanı client'ına erişemezdi.

### `apps/api/src/infrastructure/prisma/prisma.service.ts`

- Ne işe yarıyor? Lazy biçimde `PrismaClient` oluşturur ve module destroy sırasında disconnect eder.
- Neden gerekli? Repository'ler doğrudan PrismaClient yaratmak yerine merkezi bir servis kullanır.
- Kritik karar ne? `DATABASE_URL` yoksa fail etmek ve client ömrünü burada yönetmek.
- Bu dosya olmasa ne bozulurdu? Her repository'de bağlantı yönetimi dağılırdı.

### `apps/api/src/common/constants/role-names.ts`

- Ne işe yarıyor? Uygulamadaki role adlarını sabitler.
- Neden gerekli? `NAKLIYECI` gibi rol isimleri string literal karmaşasına dönüşmez.
- Kritik karar ne? Role adlarını tek merkezde toplamak.
- Bu dosya olmasa ne bozulurdu? Guard, service ve auth katmanında rol isimleri dağılırdı.

### `apps/api/src/common/decorators/current-user.decorator.ts`

- Ne işe yarıyor? Controller method'una `request.user` bilgisini parametre olarak taşır.
- Neden gerekli? Controller'ın header parse etmeden current user almasını sağlar.
- Kritik karar ne? Request içindeki `user` bilgisini tipli `AuthenticatedUser` olarak expose etmek.
- Bu dosya olmasa ne bozulurdu? Controller'lar request objesini elle açmak zorunda kalırdı.

### `apps/api/src/common/decorators/roles.decorator.ts`

- Ne işe yarıyor? Route veya controller üzerine gerekli rolleri metadata olarak yazar.
- Neden gerekli? `RolesGuard` hangi role'leri araması gerektiğini bu metadata'dan öğrenir.
- Kritik karar ne? Role bilgisini decorator metadata'sı olarak saklamak.
- Bu dosya olmasa ne bozulurdu? Role kuralı guard ile endpoint arasında temiz biçimde bağlanamazdı.

### `apps/api/src/common/guards/jwt-auth.guard.ts`

- Ne işe yarıyor? Passport JWT stratejisini Nest guard olarak route'a bağlar.
- Neden gerekli? Bearer token'dan authenticated user üretme kapısı budur.
- Kritik karar ne? Standard `AuthGuard("jwt")` üzerinden mevcut auth altyapısını reuse etmek.
- Bu dosya olmasa ne bozulurdu? `VehiclesController` authsuz kalırdı.

### `apps/api/src/common/guards/roles.guard.ts`

- Ne işe yarıyor? `@Roles(...)` metadata'sını okuyup current user role'lerini kontrol eder.
- Neden gerekli? Endpoint'in sadece `NAKLIYECI` tarafından kullanılmasını sağlar.
- Kritik karar ne? Guard'ın `request.user` üstünden çalışması.
- Bu dosya olmasa ne bozulurdu? Sadece token'a sahip olmak yeterli olur, role ayrımı düşerdi.

### `apps/api/src/common/types/authenticated-user.type.ts`

- Ne işe yarıyor? Authenticated request bağlamındaki kullanıcı tipini tanımlar.
- Neden gerekli? `CurrentUser`, `RolesGuard`, `VehiclesService` aynı şekil üzerinde konuşur.
- Kritik karar ne? Token payload'ından gelen minimum güvenilir alanları tip içinde tutmak.
- Bu dosya olmasa ne bozulurdu? Auth katmanı tip olarak dağınık hale gelirdi.

### `apps/api/src/modules/auth/auth.module.ts`

- Ne işe yarıyor? JWT stratejisi, Passport ayarları ve auth guard export'unu sağlar.
- Neden gerekli? `VehiclesModule` auth altyapısını bu modül sayesinde kullanır.
- Kritik karar ne? `JwtAuthGuard` ve `AuthService` export edilmesi.
- Bu dosya olmasa ne bozulurdu? Feature modülleri auth altyapısını standard biçimde paylaşamazdı.

### `apps/api/src/modules/auth/jwt.strategy.ts`

- Ne işe yarıyor? Bearer token payload'ını `AuthenticatedUser` nesnesine çevirir.
- Neden gerekli? `request.user` içeriği burada üretilir.
- Kritik karar ne? Token içindeki `sub`, `mail`, `kullaniciAdi`, `roles` alanlarını tek tip user nesnesine çevirmek.
- Bu dosya olmasa ne bozulurdu? Guard auth yapsa bile controller tarafında current user oluşmazdı.

### `apps/api/src/modules/vehicles/vehicles.module.ts`

- Ne işe yarıyor? Vehicles feature'ının Nest modül sınırını tanımlar.
- Neden gerekli? Controller, service, repository ve role guard burada bir araya gelir.
- Kritik karar ne? `AuthModule` import etmek ve `RolesGuard` provider'ını feature içine koymak.
- Bu dosya olmasa ne bozulurdu? Vehicles feature'ı Nest tarafından modül olarak yüklenemezdi.

### `apps/api/src/modules/vehicles/vehicles.controller.ts`

- Ne işe yarıyor? Vehicles HTTP endpoint'lerini tanımlar.
- Neden gerekli? `POST /vehicles`, `GET /vehicles/my`, `GET /vehicles/:id` istekleri burada karşılanır.
- Kritik karar ne? Guard ve role kontrolünü controller seviyesinde toplamak.
- Bu dosya olmasa ne bozulurdu? Dış dünya vehicles servisine HTTP üzerinden erişemezdi.

#### Mantıksal bloklar

1. Import bloğu  
   HTTP decorator'ları, guard'lar, DTO'lar ve service burada toplanır. Bu blok controller'ın hangi katmanlarla konuştuğunu gösterir.

2. Class decorator bloğu  
   `@Controller("vehicles")`, `@UseGuards(...)` ve `@Roles(...)` aynı yerde durur. Bunun anlamı şudur: bu controller'ın tamamı auth'lu ve role-kısıtlı bir alan olarak tasarlanmıştır.

3. Constructor  
   Controller sadece `VehiclesService` enjekte eder. Bu da controller'ın veri erişimi veya iş kuralı taşımadığını gösterir.

4. `create(...)` method'u  
   `@CurrentUser()` ve `@Body()` ile iki kaynağı birleştirir: auth context + request data. İşlem detayını service'e bırakır.

5. `getMine(...)` method'u  
   Kullanıcının “benim araçlarım” isteğini current user üstünden service'e iletir. Dışarıdan `ownerId` almaz.

6. `getMineById(...)` method'u  
   `id` parametresini `ParseIntPipe` ile güvenli sayıya çevirir ve ownership kontrollü detail sorgusuna gider.

### `apps/api/src/modules/vehicles/vehicles.service.ts`

- Ne işe yarıyor? Vehicles modülünün business rule'larını uygular.
- Neden gerekli? Normalize etme, role assertion, library çözümü, conflict çevirisi gibi davranışlar burada yaşar.
- Kritik karar ne? `AracKutuphanesi` lookup-or-create akışını service'te toplamak.
- Bu dosya olmasa ne bozulurdu? Controller çok kalınlaşır, repository ise gereğinden fazla iş kuralı taşırdı.

#### Mantıksal bloklar

1. Yardımcı normalize fonksiyonları  
   `normalizeCanonicalText` ve `normalizeVehiclePlate` service dosyasının en üstünde tanımlı. Böylece marka/model/plaka normalizasyonu servis davranışının bir parçası olarak görünür.

2. Constructor  
   Service sadece repository'yi bilir. Bu sınır, service'in veritabanı ile dolaylı konuştuğunu gösterir.

3. `create(...)`  
   Dosyanın en kritik method'udur. Role kontrolü, input normalizasyonu, library çözümü, create işlemi, conflict çevirisi ve response map burada birleşir.

4. `getMine(...)`  
   Yalnızca current user'ın araçlarını ister ve list DTO'larına map eder. Bu method, “my list” ürün davranışını açıkça taşır.

5. `getMineById(...)`  
   Ownership kontrollü detail akışını yönetir. Kayıt bulunamazsa `NotFoundException` atar.

6. `resolveVehicleLibraryId(...)`  
   Marka/model üzerinden önce lookup, yoksa create mantığını izole eder. Bu sayede create method'u okunabilir kalır.

7. `assertCarrierRole(...)`  
   Guard dışında ikinci güvenlik katmanı sağlar. Service business rule açısından “bu işlem sadece nakliyeci işlemi” demeye devam eder.

8. `rethrowUniquePlateAsConflict(...)`  
   Prisma hata kodunu HTTP dünyasının anlayacağı dile çevirir. DB constraint'in sonucunu daha iyi API davranışına dönüştürür.

9. `toListItemResponse(...)` ve `toDetailResponse(...)`  
   Internal record ile response sözleşmesi arasındaki sınırı korur. Detail şimdilik list ile aynı olsa da ayrım burada korunur.

### `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

- Ne işe yarıyor? Vehicles modülünün Prisma sorgularını kapsüller.
- Neden gerekli? Service business rule'a odaklanırken veri erişimi tek yerde kalır.
- Kritik karar ne? `vehicleSelect` ile veriyi relation dahil kontrollü seçmek ve sonucu düzleştirerek döndürmek.
- Bu dosya olmasa ne bozulurdu? Prisma sorguları service içine dağılırdı.

#### Mantıksal bloklar

1. `vehicleSelect` sabiti  
   Hangi alanların veritabanından çekileceğini tek yerde belirler. İlişkili `aracBilgisi.marka/model` burada da dahil edilir.

2. Query payload tipleri  
   Prisma select sonucunun tipi türetilir; bu da repository map fonksiyonunun tip güvenli çalışmasını sağlar.

3. Input ve output type'ları  
   Repository'nin hangi veriyi alıp hangi shape'i döndüreceği netleştirilir.

4. `findVehicleLibraryByBrandAndModel(...)`  
   Katalog lookup sorgusudur. Case-insensitive arama yapar ve ilk eşleşen id'yi döner.

5. `createVehicleLibrary(...)`  
   Yeni marka/model kaydı gerektiğinde bunu yazar.

6. `create(...)`  
   Gerçek araç insert'ini yapar, `kapasite`yi Decimal'e çevirir, select edilen sonucu map eder.

7. `findManyByOwnerId(...)`  
   My list akışının ana sorgusudur. Owner filtresi ve descending sıralama burada.

8. `findByIdAndOwnerId(...)`  
   Detail ownership kuralını doğrudan sorguya gömer.

9. `mapStoredVehicle(...)`  
   Prisma relation shape'ini düz response'a yakın bir internal record'a çevirir.

### `apps/api/src/modules/vehicles/dto/create-vehicle.dto.ts`

- Ne işe yarıyor? Create request payload'ının validation ve transform kurallarını tanımlar.
- Neden gerekli? Frontend'den gelen serbest input'un backend'e kontrollü girmesini sağlar.
- Kritik karar ne? String gelen yıl/kapasite alanlarını sayıya çevirmeye çalışmak ve whitespace normalize etmek.
- Bu dosya olmasa ne bozulurdu? Controller, geçersiz veya kirli verileri daha erken aşamada yakalayamazdı.

#### Mantıksal bloklar

1. Transform helper'ları  
   `trimAndCollapseWhitespace` ve `toNumber`, field decorator'larında tekrar kullanılacak ortak davranışları taşır.

2. `MAX_VEHICLE_YEAR` sabiti  
   Statik bir sayı yerine çalışma anındaki yıla göre sınır koyar.

3. `marka`, `model`, `plaka` alanları  
   String, boş olamaz, maksimum uzunluk sınırı var ve whitespace normalize ediliyor.

4. `yil` alanı  
   Number'a dönüştürülüyor, integer zorunlu ve makul aralıkta kalıyor.

5. `kapasite` alanı  
   Number'a dönüştürülüyor, decimal kabul ediyor, pozitif ve üst limitli.

### `apps/api/src/modules/vehicles/dto/vehicle-list-item-response.dto.ts`

- Ne işe yarıyor? Liste endpoint'inin response shape'ini tanımlar.
- Neden gerekli? Service/repository internal shape'ini doğrudan API sözleşmesi yapmamak için.
- Kritik karar ne? Liste için minimum gerekli alanları net tutmak.
- Bu dosya olmasa ne bozulurdu? Response sözleşmesi gevşer, iç model ile dış API birbirine karışırdı.

### `apps/api/src/modules/vehicles/dto/vehicle-detail-response.dto.ts`

- Ne işe yarıyor? Detail endpoint'inin response shape'ini tanımlar.
- Neden gerekli? Detail sözleşmesini liste sözleşmesinden kavramsal olarak ayırır.
- Kritik karar ne? Şimdilik list DTO'dan extend etmek.
- Bu dosya olmasa ne bozulurdu? Detail endpoint'i için ayrı gelişim alanı kalmazdı.

## Frontend dosyaları

### `apps/web/src/lib/api/vehicles.ts`

- Ne işe yarıyor? Vehicles feature'ına özel frontend API helper'larını tutar.
- Neden gerekli? Sayfalar `fetch` detayını değil feature fonksiyonlarını çağırır.
- Kritik karar ne? `createVehicle`, `getMyVehicles`, `getVehicleDetail` fonksiyonlarını tek yerde toplamak.
- Bu dosya olmasa ne bozulurdu? Her sayfa endpoint path'ini ve request detayını tekrar ederdi.

### `apps/web/src/lib/api/api-client.ts`

- Ne işe yarıyor? Ortak `fetch` wrapper'ıdır; base URL, header, hata çevirisi ve JSON parse işini yapar.
- Neden gerekli? Tüm API çağrılarında aynı davranışı üretir.
- Kritik karar ne? `accessToken` opsiyonunu merkezi olarak `Authorization` header'ına çevirmek ve API hata mesajlarını parse etmek.
- Bu dosya olmasa ne bozulurdu? Her helper kendi başına fetch/hata kodu yazmak zorunda kalırdı.

#### Mantıksal bloklar

1. `API_BASE_URL`  
   Ortam değişkeninden ya da local default'tan API kökünü çözer.

2. `ApiFetchOptions` tipi  
   Standart `RequestInit` üzerine `accessToken` alanı ekler.

3. `ApiClientError` sınıfı  
   HTTP status, kullanıcıya gösterilecek mesaj ve ham body'yi birlikte taşır.

4. `apiFetch(...)` başı  
   `accessToken`, `headers` ve diğer init seçeneklerini ayırır; ortak fetch config'i kurar.

5. Fetch çağrısı  
   `Content-Type`, opsiyonel `Authorization`, `cache: "no-store"` gibi kararlar burada uygulanır.

6. Hata işleme bloğu  
   API JSON body içindeki `message` alanını okuyup daha anlamlı hata üretir.

7. Başarı dönüşü  
   JSON body tipli promise olarak döndürülür.

### `apps/web/src/lib/auth/auth-storage.ts`

- Ne işe yarıyor? Auth bilgisini local storage'da saklar ve değişiklikleri publish eder.
- Neden gerekli? Sayfa yenilense bile token'ın client tarafında yaşamasını sağlar.
- Kritik karar ne? Hem custom event hem `storage` event ile auth değişimini izlenebilir yapmak.
- Bu dosya olmasa ne bozulurdu? `useCarrierPageAccess` ortak auth kaynağına sahip olamazdı.

### `apps/web/src/lib/auth/use-carrier-page-access.ts`

- Ne işe yarıyor? Sadece nakliyeci erişimine açık sayfalar için ortak auth/redirect hook'u sağlar.
- Neden gerekli? Her sayfada ayrı ayrı “token var mı, role doğru mu” kodu yazılmasını engeller.
- Kritik karar ne? `useSyncExternalStore` ile auth snapshot'ını storage'dan güvenli biçimde okumak ve üç durumlu (`checking`, `redirecting`, `ready`) bir API sunmak.
- Bu dosya olmasa ne bozulurdu? Create/list/detail sayfalarında erişim kontrolü dağılırdı.

#### Mantıksal bloklar

1. Tip ve status tanımları  
   Hook'un dışarıya ne döndüreceği netleştirilir.

2. `getServerAuthSnapshot()`  
   Client-only auth kaynağı için server snapshot'ı `undefined` bırakılır.

3. `useSyncExternalStore(...)` kullanımı  
   Auth state'i, custom event ve storage event değişimleriyle senkron tutulur.

4. `useEffect` redirect bloğu  
   Auth yoksa login'e, role yanlışsa ana sayfaya yönlendirir.

5. Return blokları  
   `checking`, `redirecting`, `ready` durumları sayfaların loading/render mantığını belirler.

### `apps/web/src/app/dashboard/arac_ekle/page.tsx`

- Ne işe yarıyor? Araç oluşturma formunu ve submit davranışını taşır.
- Neden gerekli? Kullanıcının create endpoint'ine ulaşabildiği somut UI giriş noktası budur.
- Kritik karar ne? Submit sonrası yeni oluşturulan kaydın detail sayfasına yönlendirmek.
- Bu dosya olmasa ne bozulurdu? Backend create endpoint'i olsa bile kullanıcı araç oluşturamazdı.

#### Mantıksal bloklar

1. Form tipi ve `initialForm`  
   Sayfanın hangi alanları yönettiği en başta netleşir.

2. `useCarrierPageAccess()` ve local state'ler  
   Sayfanın auth gereksinimi ile form durumu aynı bileşende toplanır.

3. `handleChange(...)`  
   Input `name` üzerinden generic state güncelleme yapar.

4. `handleSubmit(...)`  
   Request hazırlığı, submit kilidi, API çağrısı, hata yönetimi ve redirect burada birleşir.

5. `status !== "ready"` bloğu  
   Yetki çözülmeden formun çizilmesini engeller.

6. JSX form bloğu  
   `CarrierVehiclesShell` içinde InputField'lar ve submit butonu yer alır. Input min/max/step değerleri DTO mantığıyla uyumludur.

### `apps/web/src/app/dashboard/araclarim/page.tsx`

- Ne işe yarıyor? Giriş yapan nakliyecinin araçlarını listeler.
- Neden gerekli? Create edilen verinin kullanıcı tarafından görülebileceği ownership ekranıdır.
- Kritik karar ne? Fetch sonucunu loading/error/empty/success olmak üzere ayrı render dallarına ayırmak.
- Bu dosya olmasa ne bozulurdu? “My list” akışı ürün olarak tamamlanamazdı.

#### Mantıksal bloklar

1. Yardımcı `formatCapacity(...)`  
   Kapasiteyi kullanıcı dostu text'e çevirir.

2. Auth ve local state'ler  
   `vehicles`, `errorMessage`, `isLoading` state'leri sayfanın veri yaşam döngüsünü taşır.

3. `useEffect(...)` veri çekme bloğu  
   Auth hazır olunca request atar, unmount sonrası state set etmeyi `isMounted` ile önler.

4. `status !== "ready"` bloğu  
   İlk auth çözülme sürecinde tam ekran loading gösterir.

5. Shell ve koşullu render blokları  
   Aynı sayfada loading, error, empty state ve liste kartları ayrı ayrı yönetilir.

6. Liste kartı link'leri  
   Her kayıt detail route'una bağlanır; böylece list ekranı feature'ın navigasyon merkezi olur.

### `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

- Ne işe yarıyor? Tek bir aracın detail görünümünü verir.
- Neden gerekli? Create sonrası kullanıcıyı yeni kayda götürür ve ownership kuralını tamamlayıcı biçimde gösterir.
- Kritik karar ne? `404` durumunu ayrı bir kullanıcı mesajına çevirmek.
- Bu dosya olmasa ne bozulurdu? Create akışı başarıdan sonra anlamlı bir hedefe gidemezdi.

### `apps/web/src/components/CarrierVehiclesShell.tsx`

- Ne işe yarıyor? Vehicles feature'ı için ortak başlık, yan menü ve içerik iskeletini çizer.
- Neden gerekli? Create/list/detail sayfalarının ortak kabuğunu merkezi hale getirir.
- Kritik karar ne? `araclarim` detail route'larını da aktif menü saymak.
- Bu dosya olmasa ne bozulurdu? Sayfalar görünüm olarak dağılır, ortak navigasyon tekrar ederdi.

### `apps/web/src/components/InputField.tsx`

- Ne işe yarıyor? Etiketli input render eden küçük ortak bileşendir.
- Neden gerekli? Form alanlarında tekrar eden label/input stilini tek yerde toplar.
- Kritik karar ne? Standart HTML input props'larını geçirerek bileşeni esnek bırakmak.
- Bu dosya olmasa ne bozulurdu? Form kodları gereksiz biçimde tekrarlanırdı.

### `apps/web/src/components/HomeCustomerActions.tsx`

- Ne işe yarıyor? Ana sayfada role'a göre uygun CTA'ları gösterir.
- Neden gerekli? Nakliyeci kullanıcının araç akışına giriş noktasını görünür kılar.
- Kritik karar ne? Carrier için `Arac Ekle` ve `Araclarimi Gor` link'lerini öne çıkarmak.
- Bu dosya olmasa ne bozulurdu? Feature'a ana sayfadan doğal giriş azalırdı.

### `apps/web/src/app/register/page.tsx`

- Ne işe yarıyor? Kullanıcı kayıt ekranıdır.
- Neden gerekli? Bu raporda önemli olmasının sebebi, vehicle akışının buranın yerine geçmediğini kanıtlamasıdır.
- Kritik karar ne? Nakliyeci seçildiğinde araç alanları gösterilse de bunları submit payload'ına dahil etmemek.
- Bu dosya olmasa ne bozulurdu? Bu rapordaki “register alanları resmi vehicle akışı değildir” ayrımı görünmez olurdu.

### `docs/20-vehicles-first-flow-plan.md`

- Ne işe yarıyor? Vehicles fazının neden request'ten sonra açıldığını anlatan plan notlarını içerir.
- Neden gerekli? Bu modülün proje içi sırasını ve scope kararını anlamaya yardımcı olur.
- Kritik karar ne? İlk fazı `create + my list + detail` ile sınırlamak.
- Bu dosya olmasa ne bozulurdu? Neden bu modül bu sırada geldi sorusunun tarihsel bağlamı eksilirdi.

# Kritik Teknik Kararlar ve Nedenleri

Bu modülde en öğretici taraflardan biri, küçük görünen ama aslında çok şey belirleyen teknik kararlardır.

## 1. Vehicles ayrı bir modül olarak açıldı

Bu kararın nedeni araç bilgisinin basit bir kullanıcı profili alanı olmaması. Araç:

- sahibine bağlı
- katalog bilgisine bağlı
- ileride teklif/iş akışına bağlanabilir
- bağımsız endpoint'lere ihtiyaç duyar

Bu yüzden `users` veya `auth` içine sıkıştırılmamış.

## 2. Prisma doğrudan controller'da kullanılmadı

Controller'ın görevi HTTP konuşmaktır. Prisma doğrudan controller'a inseydi:

- route katmanı veri erişimiyle kirlenirdi
- test ve bakım zorlaşırdı
- aynı iş kuralı birden fazla route'a dağılabilirdi

Repository katmanı bu yüzden var.

## 3. Rol kontrolü hem guard hem service seviyesinde tutuldu

Guard dış dünyadan gelen HTTP isteği korur. Service ise iş kuralını korur. İkisini birlikte kullanmak savunmacı tasarımdır:

- route yanlış yapılandırılsa bile service kendi kuralını bilir
- service başka bir yerden çağrılsa da güvenlik davranışı devam eder

## 4. Sahiplik body'den değil auth context'ten türetiliyor

Bu, güvenlik açısından temel karardır. `sahipId` istemcinin değil sunucunun üretmesi gereken bir alandır.

## 5. Marka/model doğrulaması DTO'da bitmiyor, service'te devam ediyor

DTO request'i temizler. Ama `AracKutuphanesi` ilişkisinin çözülmesi business rule'dur. Bu yüzden ikinci aşama service'tedir.

## 6. Duplicate plaka kontrolünün asıl otoritesi DB

Önce “find then create” yapmak yerine DB unique constraint'e dayanmak daha güvenilir. Service yalnızca bunu kullanıcı dostu HTTP cevabına çevirir.

## 7. Listeleme sorgusu owner filtresine gömüldü

“My vehicles” davranışı sadece UI etiketiyle bırakılmadı. Repository sorgusu da doğrudan `sahipId` ile filtreleniyor. Bu, güvenlik ve veri minimizasyonu açısından doğru karar.

## 8. Frontend'de büyük state management kurulmadı

Bu feature için veri akışı basit:

- create ekranı local form state kullanıyor
- list ekranı mount olduğunda fetch ediyor
- detail ekranı id bazlı tek fetch yapıyor

Bu yüzden global store kurmak gereksiz karmaşıklık olurdu.

## 9. Ortak vehicles shell, global dashboard layout yerine component olarak tutuldu

Bu kararın anlamı şu: bu navigasyon tüm dashboard için değil, vehicles feature'ı için özel. Feature büyüklüğü bu aşamada global layout karmaşıklığını hak etmiyor.

## 10. Response DTO'lar ayrı tutuldu

Bugün list ve detail aynı alanları taşıyor diye yarın da öyle kalmak zorunda değiller. Bu ayrım erken ama yerinde bir API tasarım kararıdır.

## 11. Register ekranındaki araç alanları resmi create akışının yerine geçmiyor

Bu özellikle bilinçli. Register aşaması kullanıcı hesabı üretir; vehicle modülü ise domain nesnesi üretir. İkisini birleştirmek ilk fazda gereksiz karmaşıklık yaratırdı.

## 12. İlk faz `create + my list (+ detail)` ile sınırlandı

Bu kapsam küçültmesi önemli, çünkü en küçük değerli uçtan uca dilim seçilmiş:

- veri oluştur
- kendi verini gör
- tek kayıt detayı gör

Bu noktadan sonra update/delete gibi genişlemeler doğal olur.

# Neden Bu Kodlar Bu Katmanlara Kondu

Bu soruyu doğru anlarsan, aynı sistemi tekrar yazarken daha az bocalarsın.

## Controller katmanı

Controller'a konan şeyler:

- route path'i
- HTTP method'u
- guard'lar
- body/param/current user alma
- response tipinin service'ten dönmesi

Burada olmayan şeyler:

- Prisma sorgusu
- normalize etme mantığı
- duplicate hata çözümü
- `AracKutuphanesi` orchestration'ı

Sebep nettir: controller mümkün olduğunca ince kalmalı.

## Service katmanı

Service'e konan şeyler:

- rolü iş kuralı açısından tekrar doğrulama
- marka/model/plaka normalize etme
- `AracKutuphanesi` lookup-or-create akışı
- unique hata çevirisi
- response map'leme

Bunlar service'e kondu çünkü bunlar işin “nasıl davranması gerektiği” ile ilgilidir.

## Repository katmanı

Repository'ye konan şeyler:

- Prisma sorguları
- select tanımları
- owner filtresi
- relation çekme
- Decimal dönüşümü
- DB sonucunu uygulama içi record shape'ine dönüştürme

Repository'nin görevi “hangi veriyi nasıl okur/yazarım?” sorusudur; “ürün kuralı nedir?” sorusu değildir.

## DTO katmanı

DTO'lara konan şeyler:

- alan isimleri
- validation
- request transform
- response sözleşmesi

DTO, API kapısındaki güvenlik ve netlik katmanıdır.

## Frontend sayfa katmanı

Sayfalara konan şeyler:

- form state'i
- data fetch lifecycle'ı
- redirect
- loading/error/empty render'ı

Sayfa katmanında olmayan şeyler:

- raw fetch detayları
- token üretme/parse etme
- feature dışı global state

## Frontend helper katmanı

Helper dosyalarına konan şeyler:

- endpoint path bilgisi
- bearer token header kurulumu
- auth storage erişimi
- role bazlı page access kontrolü

Böylece sayfa kodu “ne istiyorum?” sorusuna odaklanır; “fetch'i nasıl kurarım?” sorusuna değil.

# AracKutuphanesi ve Arac İlişkisi

Bu modülün en önemli veri model kararlarından biri `AracKutuphanesi` ile `Arac` ayrımıdır.

## Mevcut ilişkisel yapı

`schema.prisma` tarafında:

- `AracKutuphanesi` marka ve model'i tutar
- `Arac` gerçek kullanıcı aracını tutar
- `Arac` içindeki `aracKutuphaneId`, katalog kaydına referans verir

`Arac` ayrıca şu alanları taşır:

- `sahipId`
- `plaka`
- `yil`
- `kapasite`

Yani gerçek araç kaydında hem sahiplik hem operasyonel bilgi vardır; ama marka/model ayrı katalog nesnesine bağlanır.

## Neden böyle ayrılmış?

Bu tasarımın mantığı şudur:

- aynı marka/model birçok araçta tekrar edebilir
- katalog bilgisini ayrı tutmak tekrarları azaltır
- ileride araç tipleri, varyantlar veya katalog yönetimi açmak daha kolay olur
- `Arac` satırını sahiplik ve operasyon bilgisine odaklı tutar

## Create akışında bu ilişki nasıl kullanılıyor?

Kullanıcı frontend'de `aracKutuphaneId` göndermez. Bunun yerine:

- marka
- model
- plaka
- yil
- kapasite

gönderir.

Backend sonra şu işi yapar:

1. marka/model normalize edilir
2. repository ile mevcut `AracKutuphanesi` kaydı aranır
3. varsa onun id'si alınır
4. yoksa yeni katalog kaydı açılır
5. gerçek araç bu id ile kaydedilir

Bu önemli, çünkü katalog id'sini kullanıcıya emanet etmez. Doğru ilişki sunucu tarafında kurulur.

## Repository sonucu neden düzleştiriliyor?

Prisma sorgusundan gelen shape relation içerir:

- `aracBilgisi.marka`
- `aracBilgisi.model`

Ama hem service hem frontend daha düz bir shape ile çalışmak istiyor. Bu yüzden repository bunu:

- `marka`
- `model`

olarak düzleştirip döndürüyor.

Bu, relation'ın varlığını gizlemek için değil; API'yi relation şemasına bağımlı kılmamak için yapılıyor.

# Auth ve Role Kontrolünün Rolü

Vehicles akışı aslında auth olmadan anlaşılamaz. Çünkü create ve my list davranışının yarısı ownership'ten gelir.

## Backend tarafındaki zincir

1. İstek bearer token ile gelir
2. `JwtAuthGuard` token'ı Passport JWT stratejisine gönderir
3. `JwtStrategy.validate(...)` payload'ı `AuthenticatedUser` objesine çevirir
4. Bu obje `request.user` olarak request'e eklenir
5. `RolesGuard` `@Roles(ROLE_NAMES.NAKLIYECI)` metadata'sını okuyup role'ü doğrular
6. `@CurrentUser()` decorator'ı aynı `request.user` objesini controller parametresine verir
7. Service içinde `assertCarrierRole(...)` ile iş kuralı tekrar doğrulanır

Bu zincirin sonucu şudur:

- auth yoksa `401`
- role yoksa `403`
- role uygun ama kayıt kullanıcıya ait değilse detail için `404`

## Frontend tarafındaki zincir

1. Auth bilgisi `auth-storage.ts` içinde localStorage'dan okunur
2. `useCarrierPageAccess()` auth snapshot'ını izler
3. Auth yoksa `/login`, role yanlışsa `/` redirect edilir
4. Sayfa yalnızca `ready` durumunda request atar
5. API'den `401` gelirse stored auth temizlenir

Bu zincirin amacı iki katmanlı güvenliktir:

- UX tarafında yanlış kullanıcıyı sayfaya sokmamak
- backend tarafında asıl otoriteyi yine korumak

## Neden service'te tekrar role check var?

Bu sık sorulan sorudur. Guard zaten role bakıyorsa service neden yine bakıyor?

Cevap: guard HTTP katmanını korur, service business rule katmanını korur. İdeal dünyada biri yeterli gibi görünür; gerçek dünyada iki katman daha güvenlidir.

# Frontend Entegrasyon Mantığı

Frontend entegrasyon mantığını kısa bir zincir olarak düşünmek en doğrusu:

1. Kullanıcı sayfaya gelir
2. Sayfa `useCarrierPageAccess` ile token/role çözer
3. Sayfa `vehicles.ts` helper'ını çağırır
4. `vehicles.ts` ortak `apiFetch` kullanır
5. `apiFetch` base URL ve bearer token ile request atar
6. Dönen veri sayfa state'ine yazılır
7. Ortak shell içinde uygun UI durumu çizilir

## Bu entegrasyon neden mantıklı?

Çünkü sorumluluklar ayrılmış:

- sayfa: ne göstereceğini bilir
- feature helper: hangi endpoint'i çağıracağını bilir
- api client: HTTP mekanizmasını bilir
- auth helper: token'ı ve role bilgisini bilir

Bu ayrım hem create hem list hem detail için tekrar kullanılıyor.

## Sayfa-level yaklaşımın pratik sonucu nedir?

Create, list ve detail sayfalarının üçü de aynı erişim standardını kullanıyor. Biri diğerinden daha gevşek davranmıyor. Böylece feature içinde tutarlı bir koruma oluşuyor.

## Loading ve hata yönetimi neden burada önemli?

Bu feature client-side auth'a dayandığı için kullanıcı experience'i büyük ölçüde state geçişleriyle okunuyor:

- auth çözülüyor
- veri yükleniyor
- hata gelebiliyor
- boş sonuç dönebiliyor

Liste ekranı bu geçişleri en görünür haliyle taşıyor. Bu yüzden `isLoading`, `errorMessage` ve `vehicles.length === 0` dalları önemli.

# Bu Yapıyı Tek Başına Yeniden Yazmak İçin İzlenecek Sıra

Bu bölüm mevcut implementasyonu öğretici sıraya çevirir. Yeni kod vermiyor; sadece nasıl düşünmen gerektiğini söylüyor.

## Önce hangi dosyayı açmalısın?

İlk okumada şu sırayı öneririm:

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/modules/vehicles/vehicles.controller.ts`
3. `apps/api/src/modules/vehicles/vehicles.service.ts`
4. `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`
5. `apps/web/src/lib/api/vehicles.ts`
6. `apps/web/src/app/dashboard/arac_ekle/page.tsx`
7. `apps/web/src/app/dashboard/araclarim/page.tsx`
8. `apps/web/src/lib/auth/use-carrier-page-access.ts`

Bu sıra bilinçlidir:

- önce veri modeli
- sonra backend giriş kapısı
- sonra iş kuralları
- sonra DB erişimi
- sonra frontend çağrı noktaları
- sonra sayfalar

## Backend'de önce ne düşünmelisin?

Tek başına yeniden kuracaksan backend tarafında şu düşünce sırası en sağlıklısıdır:

1. Hangi tablo/ilişkiyle çalışıyorum?
2. Request payload ne olacak?
3. Response shape ne olacak?
4. Ownership hangi kaynaktan gelecek?
5. Business rule olarak hangi normalizasyonlar var?
6. Repository hangi sorgulara ihtiyaç duyacak?
7. Controller bunları hangi endpoint'lerden expose edecek?

Bu projedeki implementasyon tam olarak bu düşünce sırasına yakın ilerliyor.

## Backend'de yazım sırası nasıl olmalı?

Mevcut yapıyı tekrar kurmak istiyorsan mantıksal yazım sırası şu olabilir:

1. Veri modelini ve ilişkiyi netleştir
2. Create DTO ve response DTO'ları tanımla
3. Repository select ve sorgularını yaz
4. Service business rule'larını yaz
5. Controller endpoint'lerini bağla
6. Module ve AppModule bağlantısını yap
7. Auth/role kısıtını route'a ekle

Buradaki en kritik nokta şudur: repository'den önce service yazmak da mümkündür ama repository ihtiyacını zihninde netleştirmeden service dağılabilir.

## Frontend'de önce ne düşünmelisin?

Frontend tarafında kendine şu soruları sormalısın:

- Bu sayfaya kim girebilir?
- Token'ı nereden alacağım?
- Hangi endpoint'i çağıracağım?
- Hangi state'leri tutacağım?
- Başarıdan sonra nereye gideceğim?
- Hata, loading ve empty durumlarını nasıl göstereceğim?

Bu projedeki create ve list sayfaları tam olarak bu sorular üzerinden şekillenmiş.

## Frontend'de yazım sırası nasıl olmalı?

Öğretici olarak şu sıra mantıklıdır:

1. Önce `vehicles.ts` API helper'ını yaz
2. Sonra auth gate hook'unu bağla
3. Sonra create sayfasını yaz
4. Ardından my list sayfasını yaz
5. En sonda detail sayfasını ekle
6. Ortak shell ile sayfaları aynı feature altında birleştir

Bu sıralama iyidir, çünkü önce veri alışverişi standardını kurar, sonra UI akışlarını onun üstüne oturtursun.

## Test ederken hangi sırayla ilerlemelisin?

Manuel test aklıyla şu sıra en verimlisidir:

1. Nakliyeci kullanıcı ile login ol
2. `/dashboard/arac_ekle` sayfasına erişebildiğini doğrula
3. Geçerli veri ile create yap
4. Başarı sonrası detail sayfasına gittiğini doğrula
5. `/dashboard/araclarim` ekranında yeni kaydın göründüğünü doğrula
6. Aynı plaka ile create deneyip conflict davranışını gözle
7. Müşteri hesabı ile aynı sayfalara gitmeye çalışıp erişim kuralını doğrula
8. Geçersiz token ile `401` akışının auth temizlediğini doğrula

Bu sıralama, hem backend hem frontend zincirini tek tek izlemeyi kolaylaştırır.

## Update ve delete eklemek istersen mevcut yapının hangi parçalarını referans almalısın?

Şimdiden bakman gereken mevcut parçalar şunlardır:

- ownership için: `findByIdAndOwnerId(...)`
- role için: `assertCarrierRole(...)`
- normalizasyon için: service içindeki normalize helper'ları
- conflict çevirisi için: `rethrowUniquePlateAsConflict(...)`
- frontend API standardı için: `vehicles.ts`
- auth erişim standardı için: `useCarrierPageAccess(...)`
- detay ekranı başlangıç noktası için: `/dashboard/araclarim/[id]/page.tsx`

Yani update/delete eklemek tamamen sıfırdan başlamak anlamına gelmez; mevcut yapı zaten genişlemeye uygun iskeleti vermiş durumda.

# Sonraki Doğal Genişleme: Update ve Delete’i Nereye Eklersin

Bu bölümde mevcut yapıyı temel alarak doğal genişleme yönünü anlatıyorum. Burada anlatılanlar mevcut kodda yapılmış değildir; sadece mevcut mimaride nereye ekleneceğini gösterir.

## Backend tarafı

Update eklenecekse doğal yerler şunlardır:

- `vehicles.controller.ts` içine yeni route method'ları
- `vehicles.service.ts` içine ownership kontrollü update mantığı
- `vehicles.repository.ts` içine owner + id bazlı update sorguları
- yeni request DTO dosyaları

Burada mevcut yapıdan doğrudan reuse edilecek parçalar:

- current user alma
- role assertion
- marka/model normalizasyonu
- `AracKutuphanesi` çözüm mantığı
- duplicate plaka conflict çevirisi

Delete eklenecekse ilk dikkat edilmesi gereken veri modelidir. Çünkü mevcut `Arac` modelinde soft delete alanı yok. Bu yüzden delete genişlemesinde önce karar verilmesi gereken şey:

- hard delete mi yapılacak
- yoksa schema değiştirip soft delete mi eklenecek

Mevcut yapının en doğal uzantısı, owner + id filtreli repository method'ları üzerinden ilerlemek olur.

## Frontend tarafı

Update/delete için doğal başlangıç ekranı detail sayfasıdır. Çünkü kullanıcı tek bir araca zaten oradan ulaşıyor.

Mevcut frontend yapısından reuse edilecek parçalar:

- `vehicles.ts` içine yeni helper fonksiyonları ekleme biçimi
- `apiFetch` ile token gönderme standardı
- `useCarrierPageAccess` ile sayfa koruması
- `CarrierVehiclesShell` ile feature içi gezinme

Update formu açılacaksa create sayfasındaki form state yaklaşımı iyi referanstır. Delete aksiyonu eklenecekse liste ekranındaki refetch ve empty state mantığı iyi referanstır.

## Neden update/delete ilk faza alınmadı?

Bunun nedeni teknik olduğu kadar ürünseldir de:

- önce kayıt oluşturmanın ve görmenin oturması gerekir
- ownership, auth ve DTO iskeleti önce sabitlenir
- araç nesnesinin temel sözleşmesi önce görülür
- update/delete gereksinimi sonra daha temiz tasarlanır

Yani ilk fazın dar tutulması eksiklik değil, bilinçli kapsam yönetimidir.

# Kısa Özet

Mevcut vehicles akışı, nakliyeci için resmi araç kaydı açan ilk tam feature dilimidir. Backend tarafında controller/service/repository/DTO ayrımıyla kurulmuş; frontend tarafında ise create sayfası, my list sayfası, detail sayfası, auth hook'u ve ortak API helper'larıyla bağlanmıştır.

Araç ekleme akışında en kritik kararlar şunlardır:

- sahiplik body'den değil current user'dan gelir
- marka/model service içinde `AracKutuphanesi` ile çözülür
- plaka normalize edilerek yazılır
- duplicate plaka aslen DB unique constraint ile korunur

Araç listeleme akışında en kritik kararlar şunlardır:

- yalnızca giriş yapan kullanıcının kayıtları döner
- ownership filtresi repository sorgusuna gömülüdür
- frontend tarafında loading/error/empty state açıkça ayrılır
- page access kontrolü middleware değil, `useCarrierPageAccess` hook'u ile yapılır

Register ekranındaki araç alanları şu anda resmi vehicle akışının parçası değildir. Görünürler ama submit payload'ına girmezler; bu yüzden gerçek araç kaydı `vehicles` modülünde ayrı bir adım olarak açılmıştır.

## Terminal Özeti

- Oluşturulan dosya: `docs/21-vehicles-create-list-deep-explanation.md`
- Analiz edilen ana akışlar: araç ekleme, kendi araçlarını listeleme, bağlam için kısa detail akışı
- En kritik dosyalar: `vehicles.service.ts`, `vehicles.repository.ts`, `vehicles.controller.ts`, `create-vehicle.dto.ts`, `/dashboard/arac_ekle/page.tsx`, `/dashboard/araclarim/page.tsx`, `use-carrier-page-access.ts`, `api-client.ts`, `schema.prisma`
- Update/delete için temel alınabilecek parçalar: owner bazlı repository sorguları, service içindeki rol ve normalizasyon mantığı, `vehicles.ts` API helper deseni, detail sayfası ve ortak shell yapısı
