# Amaç

Bu rehberin amacı iki şeyi aynı anda öğretmektir:

1. Mevcut `vehicles create + my list` akışını gerçekten anlayarak öğrenmek
2. Bu yapının üstüne `delete` ve `update` özelliklerini doğru sırayla elle yazabilecek seviyeye gelmek

Bu belge yeni kod vermek için değil, sana doğru düşünme ve doğru yazma sırasını göstermek için hazırlandı. Yani burada “şu satırı kopyala” yaklaşımı yok. Onun yerine:

- önce hangi dosyayı okuyacağını
- sonra hangi akışı zihninde kuracağını
- sonra yeni feature eklerken hangi dosyadan başlayacağını
- mentöre sunarken hangi sırayla anlatacağını

netleştiriyoruz.

# İlk Kural: Önce Veri Modelini Anla

Araç ekleme ve araç listelemeyi ezberleyerek öğrenemezsin. Çünkü bütün feature şu veri modelinin üstüne oturuyor:

- `Arac`
- `AracKutuphanesi`
- `Kullanici`

Bu yüzden ilk açacağın dosya:

- `apps/api/prisma/schema.prisma`

Bu dosyada özellikle şunları net görmelisin:

- `Arac.sahipId`
- `Arac.aracKutuphaneId`
- `Arac.plaka @unique`
- `Arac.kapasite Decimal`
- `AracKutuphanesi.marka`
- `AracKutuphanesi.model`

Bu dosyayı anlamadan controller veya frontend okumak tehlikelidir. Çünkü o durumda sadece route ve buton görürsün, ama sistemin neden o şekilde tasarlandığını anlayamazsın.

# Mevcut Create + My List Akışını Öğrenme Sırası

Buradaki sıra rastgele değil. Bu sıralamayı takip edersen feature’ın zihninde doğal olarak kurulması gerekir.

## 1. `schema.prisma`

İlk soru şu olmalı:

- hangi veri tutuluyor?
- hangi alan kullanıcıya ait?
- hangi alan katalog ilişkisi?
- hangi alan unique?

Burada öğrenmen gereken ana fikir:

- gerçek araç kaydı `Arac`
- marka/model tanımı `AracKutuphanesi`
- ownership `sahipId`

## 2. `vehicles.controller.ts`

İkinci dosya:

- `apps/api/src/modules/vehicles/vehicles.controller.ts`

Bu dosyayı ikinci sıraya koyma sebebi şudur: dış dünyadan sisteme giriş burada.

Burada ilk olarak endpoint yüzeyini gör:

- `POST /vehicles`
- `GET /vehicles/my`
- `GET /vehicles/:id`

Sonra şu auth zincirini öğren:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(ROLE_NAMES.NAKLIYECI)`
- `@CurrentUser()`

Bu dosya sana şunu öğretir: “request sisteme nereden giriyor?”

## 3. `vehicles.service.ts`

Üçüncü dosya:

- `apps/api/src/modules/vehicles/vehicles.service.ts`

Bu dosya feature’ın beyni. Burada özellikle şu soruların cevabını bul:

- neden `sahipId` body’den alınmıyor?
- plaka neden normalize ediliyor?
- marka/model neden burada çözülüyor?
- duplicate plaka neden burada `409` conflict’e çevriliyor?
- neden listeleme sadece current user’a ait kayıtları döndürüyor?

Bu dosya sana şunu öğretir: “sistem bu isteğe nasıl davranıyor?”

## 4. `vehicles.repository.ts`

Dördüncü dosya:

- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

Burada service’in istediği işi veritabanına nasıl çevirdiğini görürsün. Şu method’ları tek tek anlamalısın:

- `findVehicleLibraryByBrandAndModel`
- `createVehicleLibrary`
- `create`
- `findManyByOwnerId`
- `findByIdAndOwnerId`

Bu dosya sana şunu öğretir: “business rule, DB sorgusuna nasıl dönüşüyor?”

## 5. DTO dosyaları

Sonra şu dosyaları aç:

- `create-vehicle.dto.ts`
- `vehicle-list-item-response.dto.ts`
- `vehicle-detail-response.dto.ts`

Burada request ve response sözleşmesi netleşir. Özellikle:

- frontend hangi alanları gönderebilir?
- backend hangi alanları geri döndürüyor?
- neden detail DTO ayrı ama şu an list DTO ile aynı?

## 6. `app.module.ts`

Sonra:

- `apps/api/src/app.module.ts`

Burada sadece tek şeyi öğren:

- `VehiclesModule` uygulamaya nasıl bağlanmış?

Bu dosya küçük ama önemlidir. Çünkü bir modül yazılmış olabilir; ama root module’a eklenmezse o feature gerçekte yoktur.

## 7. `apps/web/src/lib/api/vehicles.ts`

Frontend tarafında ilk açacağın dosya budur. Çünkü frontend’in backend’e hangi helper’larla gittiğini burada görürsün.

Şunları öğren:

- create için hangi helper kullanılıyor?
- list için hangi helper kullanılıyor?
- detail için hangi helper kullanılıyor?

Yani “butondan sonra hangi fonksiyon çağrılıyor?” sorusunun ilk cevabı burada başlar.

## 8. `apps/web/src/lib/api/api-client.ts`

Bu dosya sana şunu öğretir:

- token nasıl header’a ekleniyor?
- `Authorization: Bearer ...` nerede kuruluyor?
- hata mesajı nasıl parse ediliyor?

Yani frontend’in HTTP seviyesinde nasıl konuştuğunu burada anlarsın.

## 9. `apps/web/src/lib/auth/use-carrier-page-access.ts`

Bu dosyada şu sorunun cevabı var:

- bu sayfaya kim girebilir?

Burada şunları öğren:

- auth yoksa ne oluyor?
- role yanlışsa ne oluyor?
- `ready`, `checking`, `redirecting` durumları neden var?

## 10. `arac_ekle/page.tsx`

Sonra:

- `apps/web/src/app/dashboard/arac_ekle/page.tsx`

Bu dosya sana “butona basınca ne oluyor?” sorusunun gerçek frontend cevabını verir.

Şunları izle:

- form state nasıl tutuluyor?
- submit anında hangi helper çağrılıyor?
- response gelince neden detail sayfasına gidiliyor?
- `401` ve `403` nasıl ele alınıyor?

## 11. `araclarim/page.tsx`

Sonra:

- `apps/web/src/app/dashboard/araclarim/page.tsx`

Burada liste ekranının veri akışını gör:

- sayfa açılınca ne oluyor?
- `useEffect` ne zaman fetch yapıyor?
- loading / error / empty / data state’leri nasıl ayrılıyor?

## 12. `araclarim/[id]/page.tsx`

En sonda:

- `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

Bu dosya create/list’in ana konusu değil ama iki nedenle önemli:

- create sonrası neden detail’e gittiğini anlarsın
- ownership kuralının detail’de nasıl tamamlandığını görürsün

# Create + My List Akışını Zihninde Nasıl Kurmalısın

Burada amaç satır ezberlemek değil, akış zincirini kurmaktır.

## Araç ekleme zinciri

Şu sırayı ezberleme, mantığıyla kur:

1. kullanıcı `/dashboard/arac_ekle` sayfasını açar
2. `useCarrierPageAccess` auth ve role kontrolü yapar
3. kullanıcı formu doldurur
4. submit anında sayfa `createVehicle(...)` helper’ını çağırır
5. helper `apiFetch` ile `/vehicles` endpoint’ine gider
6. `apiFetch` bearer token’ı header’a ekler
7. backend controller request’i alır
8. guard’lar auth ve role kontrolünü yapar
9. `@CurrentUser()` ile kullanıcı alınır
10. service `sahipId = currentUser.id` kararını verir
11. service plaka ve marka/model normalizasyonu yapar
12. service `AracKutuphanesi` kaydını bulur veya oluşturur
13. repository gerçek `Arac` kaydını yazar
14. response detail DTO olarak geri döner
15. frontend `response.id` ile detail sayfasına gider

Buradan çıkaracağın ana ders:

- controller giriş kapısıdır
- service karar verir
- repository DB’ye yazar
- frontend helper ile konuşur

## Araç listeleme zinciri

Şu sırayı kur:

1. kullanıcı `/dashboard/araclarim` sayfasını açar
2. page access kontrolü çalışır
3. `useEffect` içinde `getMyVehicles(...)` çağrılır
4. helper `/vehicles/my` endpoint’ine gider
5. controller current user alır
6. service `getMine(currentUser.id)` mantığını işletir
7. repository `findManyByOwnerId` ile sadece o kullanıcıyı çeker
8. frontend sonucu state’e yazar
9. loading / error / empty / data dalları render edilir

Buradan çıkaracağın ana ders:

- “my list” UI etiketi değil, gerçek ownership sorgusudur

# Mentöre Sunum Sırası

Kod yazma sırası ile anlatma sırası aynı olmak zorunda değil. Sunum için en doğru sıra şudur:

## 1. Önce veri modeli

İlk sunacağın dosya:

- `apps/api/prisma/schema.prisma`

Çünkü mentör önce şu soruyu sorar:

- bu feature hangi veri modeli üstüne oturuyor?

Burada şu üç şeyi söyle:

- gerçek araç `Arac`
- katalog bilgisi `AracKutuphanesi`
- ownership `sahipId`

## 2. Sonra endpoint yüzeyi

İkinci sunacağın dosya:

- `apps/api/src/modules/vehicles/vehicles.controller.ts`

Burada şu cümleyi kur:

- dış dünyadan feature’a giriş bu dosyada başlıyor

## 3. Sonra business rule

Üçüncü sunacağın dosya:

- `apps/api/src/modules/vehicles/vehicles.service.ts`

Burada özellikle şu kararları anlat:

- sahiplik body’den değil auth’tan gelir
- plaka normalize edilir
- marka/model service’te çözülür
- duplicate plaka DB constraint’ten gelir, service bunu `409`’a çevirir

## 4. Sonra repository

Dördüncü sunacağın dosya:

- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

Burada service’in istediği işin DB’de nasıl yapıldığını göster.

## 5. Sonra DTO’lar

Burada request ve response sözleşmesini anlat.

## 6. Sonra frontend helper

İlk frontend dosyası:

- `apps/web/src/lib/api/vehicles.ts`

Çünkü page’den önce helper mantığını görmek daha temizdir.

## 7. Sonra auth gate

- `apps/web/src/lib/auth/use-carrier-page-access.ts`

Burada “bu sayfaya herkes giremiyor” fikrini anlat.

## 8. Sonra create page

- `apps/web/src/app/dashboard/arac_ekle/page.tsx`

Burada “butona basınca ne oluyor?” anlatılır.

## 9. Sonra list page

- `apps/web/src/app/dashboard/araclarim/page.tsx`

Burada “liste hangi helper ile doluyor?” anlatılır.

# Delete Özelliğini Elle Yazacak Olsan Hangi Sırayla Giderdin

Delete tarafında ilk soru teknik değildir, domain sorusudur:

- hard delete mi?
- soft delete mi?

Mevcut `Arac` modelinde soft delete alanı olmadığı için, mevcut yapıya en yakın başlangıç hard delete düşünmektir. Eğer hocan soft delete isterse önce schema kararın değişir.

## Delete için backend yazım sırası

### 1. Önce endpoint kararını netleştir

İlk düşüneceğin şey:

- route ne olacak?

En doğal aday:

- `DELETE /vehicles/:id`

Burada henüz detay koduna girme. Sadece dış yüzeyi kilitle.

### 2. Sonra controller method’unu tasarla

İlk kod yazmaya başlayacağın backend dosyası büyük ihtimalle:

- `vehicles.controller.ts`

Çünkü önce sisteme “bu feature’ın yeni girişi budur” dersin.

Controller’da düşünmen gerekenler:

- `id` parametresi alacak mı?
- `@CurrentUser()` kullanılacak mı?
- hangi service method’unu çağıracak?
- response ne olacak?

### 3. Sonra service method’unu tasarla

İkinci backend dosyası:

- `vehicles.service.ts`

Burada sıralaman şu olmalı:

1. rol kontrolü
2. kayıt bu kullanıcıya ait mi?
3. kayıt yoksa veya kullanıcıya ait değilse `404`
4. silme işlemini repository’ye devret
5. response davranışını belirle

Buradaki kritik kural:

- current user auth’tan gelir
- ownership body veya frontend’den gelmez

### 4. Sonra repository delete davranışını tasarla

Üçüncü backend dosyası:

- `vehicles.repository.ts`

Burada iki yaklaşım düşünürsün:

- önce owner + id ile bul, sonra sil
- ya da doğrudan owner + id bazlı silme stratejisi kur

Mevcut yapıya en yakın referans:

- `findByIdAndOwnerId`

Çünkü delete de ownership kontrollü olmak zorunda.

### 5. Sonra response davranışını belirle

Burada karar vermen gereken soru:

- boş `204 No Content` mü dönecek?
- yoksa silinen kaydın özetini mi döneceksin?

Mevcut yapı sade olduğu için `204` daha doğal bir başlangıç olabilir. Ama bu karar hocanın beklentisine göre değişebilir.

## Delete için frontend yazım sırası

### 1. Önce API helper düşün

İlk frontend dosyası:

- `apps/web/src/lib/api/vehicles.ts`

Çünkü page’den önce helper gerekir.

### 2. Sonra butonun hangi ekranda olacağını seç

En doğal yer:

- detail sayfası

Alternatif:

- list kartı üstü aksiyon

Öğrenme açısından en temiz başlangıç detail ekranıdır. Çünkü tek kayıt üstünde işlem yapıyorsun.

### 3. Sonra kullanıcı aksiyon zincirini kur

Şu sırayı düşün:

1. kullanıcı sil butonuna basar
2. gerekiyorsa onay sorulur
3. delete helper çağrılır
4. başarılıysa kullanıcı liste ekranına gider
5. liste güncel haliyle açılır

### 4. Sonra hata akışını planla

Delete tarafında özellikle şunları düşün:

- `401` ise auth temizle
- `403` ise yönlendir
- `404` ise kayıt yok veya kullanıcıya ait değil

## Delete için referans alacağın mevcut parçalar

- ownership için `findByIdAndOwnerId`
- role için `assertCarrierRole`
- endpoint örneği için mevcut controller method’ları
- redirect mantığı için create/detail akışı
- helper standardı için `vehicles.ts`

# Update Özelliğini Elle Yazacak Olsan Hangi Sırayla Giderdin

Update delete’ten daha zordur. Çünkü sadece kayıt bulup işlem yapmak yetmez; validation ve normalizasyon yeniden devreye girer.

## Update için ilk düşünce

Önce şu soruları cevaplaman gerekir:

- hangi alanlar güncellenebilir?
- plaka değişebilir mi?
- marka/model değişirse `AracKutuphanesi` çözümü yeniden çalışacak mı?
- create ile aynı alanlar mı güncellenecek?

Bu soruları netleştirmeden update yazmaya başlama.

## Update için backend yazım sırası

### 1. Önce request DTO’yu düşün

Update için ilk yazmayı düşüneceğin dosya çoğu zaman DTO’dur.

Sebep basit:

- request shape net değilse controller ve service dağılır

Burada kararın şu:

- create DTO’yu birebir kopyalamak zorunda değilsin
- ama benzer alanlar güncellenecekse validation mantığı büyük ölçüde benzer olur

### 2. Sonra endpoint kararını ver

İkinci adım:

- `PATCH /vehicles/:id` mi?
- `PUT /vehicles/:id` mi?

Mevcut yapıda parça güncelleme gibi düşünüyorsan `PATCH` daha doğal olur.

### 3. Sonra controller method’unu kur

Burada düşüneceğin şeyler:

- `id` parametresi
- `@CurrentUser()`
- `@Body()`
- service method’una geçiş

### 4. Sonra service method’unu tasarla

Bu update’in en kritik yeri:

1. rol kontrolü
2. ownership kontrolü
3. kayıt var mı?
4. plaka değişiyorsa normalize et
5. marka/model değişiyorsa `AracKutuphanesi` id’sini yeniden çöz
6. duplicate plaka olursa yine `P2002 -> 409`
7. response’u detail DTO’ya map et

Yani update tarafında mevcut create service mantığının büyük bölümü tekrar kullanılır.

### 5. Sonra repository update sorgusunu tasarla

Burada kural değişmez:

- owner + id filtresi korunmalı
- ilgili alanlar update edilebilmeli
- `aracKutuphaneId` gerekiyorsa yeniden set edilebilmeli

### 6. Sonra response shape’ini belirle

Mevcut yapıya en yakın başlangıç:

- detail DTO döndürmek

Çünkü update sonrası kullanıcıya güncel kaydı göstermek en doğal davranıştır.

## Update için frontend yazım sırası

### 1. Önce giriş noktasını seç

En doğal giriş:

- detail sayfasından edit aksiyonu

### 2. Sonra edit sayfası mı aynı sayfada form mu karar ver

Öğrenme açısından daha temiz olan:

- ayrı bir edit sayfası düşünmek

Sebep:

- create ve edit sorumlulukları ayrılır
- form mantığı daha net kalır

### 3. Sonra helper fonksiyonunu düşün

Yine ilk frontend dosyan:

- `vehicles.ts`

Çünkü page’den önce API konuşma standardı gerekir.

### 4. Sonra formu create sayfasını referans alarak tasarla

Burada sıfırdan düşünmene gerek yok. Referansın şu olmalı:

- `arac_ekle/page.tsx`

Ama fark şu:

- create’te boş form açılır
- edit’te mevcut veri initial state olur

### 5. Sonra submit sonrası nereye döneceğini belirle

En doğal yol:

- tekrar detail sayfasına dönmek

Çünkü kullanıcı güncellenen kaydı hemen görmek ister.

## Update için referans alacağın mevcut parçalar

- create DTO mantığı
- service içindeki normalize helper’lar
- `resolveVehicleLibraryId`
- duplicate conflict çevirisi
- create page form state yapısı

# Gerçek Çalışma Sırası

Sen bunu elle yazmaya hazırlanırken çalışma sıran şu olmalı:

## Aşama 1: Mevcut akışı kağıda çıkar

Önce create/list akışını konuşmadan, ekrana bakmadan kağıda yazmayı dene:

- endpoint ne?
- controller ne alıyor?
- service ne yapıyor?
- repository ne yapıyor?
- frontend hangi helper’ı çağırıyor?
- token nasıl gidiyor?

Bunu yapamıyorsan update/delete’e geçme.

## Aşama 2: Delete için sadece backend sırası yaz

Koda geçmeden önce şunu kağıda çıkar:

- ilk dosya
- ikinci dosya
- üçüncü dosya
- ownership kuralı
- response davranışı

## Aşama 3: Delete frontend sırası yaz

Şunları sırala:

- helper
- butonun yeri
- click sonrası akış
- redirect
- hata durumu

## Aşama 4: Update backend sırası yaz

Şunları yaz:

- önce DTO
- sonra endpoint
- sonra service mantığı
- sonra repo
- sonra response

## Aşama 5: Update frontend sırası yaz

Şunları yaz:

- edit giriş noktası
- helper
- form state
- mevcut veriyi doldurma
- submit sonrası redirect

# Başarı Kriteri

Bu rehberi gerçekten çalışmış sayılman için şu sorulara tereddütsüz cevap verebilmelisin:

- create endpoint’i nedir?
- my list endpoint’i nedir?
- request controller’dan service’e nasıl gider?
- service neden repository’ye gider?
- `sahipId` neden body’den alınmaz?
- frontend’de create butonuna basınca hangi helper çağrılır?
- bearer token nerede header’a eklenir?
- my list neden sadece current user kayıtlarını döndürür?
- delete eklerken ilk backend dosyan hangisi olur?
- update eklerken neden önce DTO düşünmek daha doğrudur?

# Kısa Sonuç

Öğrenme sırası ile yazma sırası birbirine yakın ama birebir aynı değildir.

En doğru öğrenme başlangıcı:

- önce `schema.prisma`

En doğru sunum başlangıcı:

- yine `schema.prisma`

Delete eklerken en doğal ilk backend adımı:

- yeni endpoint yüzeyini controller’da netleştirmek

Update eklerken en doğal ilk backend adımı:

- request DTO’yu netleştirmek

Frontend tarafında hem update hem delete için ilk düşünmen gereken dosya:

- `apps/web/src/lib/api/vehicles.ts`

Çünkü page yazmadan önce, page’in konuşacağı helper’ı netleştirmen gerekir.
