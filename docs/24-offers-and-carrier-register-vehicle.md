# Amaç

Bu adımda iki bağlı eksik birlikte kapatıldı:

- `NAKLIYECI` register olduğunda zorunlu alınan ilk araç bilgisinin gerçekten DB'ye yazılması
- `offers` modülünün ilk gerçek fazının açılması

Bu iki konu özellikle birlikte ele alındı; çünkü taşıyıcının teklif verebilmesi için en az bir aktif araç şartı vardı ve register akışında zorunlu araç alınmasına rağmen bu kayıt daha önce oluşmuyordu.

# Bu Adımda Ne Değişti

- `AuthService` register akışı transaction seviyesinde genişletildi.
- `NAKLIYECI` register olduğunda kullanıcı + rol + ilk araç tek transaction içinde oluşturulur hale geldi.
- Araç yazma mantığı auth içine gömülmedi; shared vehicle helper ile yürütüldü.
- Register DTO ve frontend formu, nakliyeci araç alanlarını gerçek request body'ye bağlayacak şekilde güncellendi.
- `offers` modülü controller/service/repository katmanlarıyla açıldı.
- Yeni offers endpointleri eklendi.
- Taşıyıcı tarafında açık istek listesi, açık istek detay/teklif formu ve kendi teklifleri ekranı eklendi.
- Müşteri request detail ekranına gelen teklifler bölümü eklendi.
- `Rol` ve `TEKLIF/OLUSTURULDU` durumu için idempotent seed migration eklendi ve lokal DB'ye uygulandı.

# Neden Offers Bu Aşamada Açıldı

`transport-requests` ve `vehicles` modülleri create/list/detail/update/delete/soft-delete seviyesine geldikten sonra doğal sonraki domain halkası teklif verme akışıydı. Bu aşamada offers açmak mantıklıydı çünkü:

- müşteri artık gerçek request oluşturabiliyor
- taşıyıcı artık gerçek araç yönetimi yapabiliyor
- request ile vehicle arasında iş değeri üreten ilk ilişki offers üzerinden kuruluyor

Bu fazda teklif kabul/reddetme, job oluşturma ve bildirim gibi ikinci faz konular özellikle dışarıda bırakıldı.

# NAKLIYECI Register Sonrası İlk Araç Kaydı Nasıl Çalışıyor

Register akışı artık şu sırayla çalışıyor:

1. register input normalize edilir
2. mail ve kullanıcı adı benzersizlik kontrolü yapılır
3. rol id çözülür
4. kullanıcı + rol eşlemesi transaction içinde oluşturulur
5. rol `NAKLIYECI` ise ilk araç yine aynı transaction içinde oluşturulur

İlk araç oluşturulurken:

- marka/model normalize edilir
- plaka normalize edilir
- `AracKutuphanesi` kaydı çözülür veya oluşturulur
- araç kaydı `sahipId = createdUser.id` ile yazılır

Bu işlem tek transaction olduğu için araç kaydı başarısızsa kullanıcı da yarım oluşmuş halde kalmaz.

# Register ve Vehicles Entegrasyon Kararı

Karar şu şekilde uygulandı:

- transaction orkestrasyonu `AuthService` seviyesinde kaldı
- ama vehicle iş kuralı auth katmanına taşınmadı

Bu yüzden shared helper kullanıldı:

- `vehicle-write.helpers.ts`

Bu helper içinde:

- plaka normalize etme
- marka/model normalize etme
- `AracKutuphanesi` çözümü
- owner'a araç oluşturma

aynı çizgide tutuldu.

Bu kararın nedeni:

- register akışı vehicle modülünü bypass etse de vehicle kuralını kopyalamasın
- ileride vehicle yazma mantığı tek yerde kalabilsin
- auth servisi sadece orkestrasyon yapsın

Resmi müşteri rolü `MUSTERI` olarak korunmuştur. Legacy veride `KULLANICI` varsa sistem bunu `MUSTERI` ile eşdeğer yorumlamaya devam eder; ancak yeni akışlarda resmi rol adları `MUSTERI`, `NAKLIYECI`, `ADMIN` olarak kullanılır.

# Offers Backend Yapısı

Eklenen backend yüzeyi:

- `GET /api/v1/offers/open-requests`
- `GET /api/v1/offers/open-requests/:requestId`
- `POST /api/v1/offers/requests/:requestId`
- `GET /api/v1/offers/my`
- `GET /api/v1/offers/requests/:requestId/incoming`

Katmanlar:

- [offers.controller.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/offers/offers.controller.ts)
- [offers.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/offers/offers.service.ts)
- [offers.repository.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/offers/repositories/offers.repository.ts)
- [offers.module.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/offers/offers.module.ts)

Request create body'si sade tutuldu:

- `fiyat`
- `not?`

İstemciden alınmayan alanlar:

- `nakliyeciId`
- `durumId`
- `requestId` body içinde

Bunlar backend tarafından çözülür:

- `requestId` route param'dan gelir
- `nakliyeciId` `currentUser.id` olur
- başlangıç offer status'u `TEKLIF/OLUSTURULDU` olarak çözülür

# Offers Frontend Yapısı

Eklenen / doldurulan ekranlar:

- [acik_istekler/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/acik_istekler/page.tsx)
- [acik_istekler/[id]/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx)
- [tekliflerim/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/tekliflerim/page.tsx)

Redirect davranışı:

- [teklif_ver/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/teklif_ver/page.tsx) bağımsız form ekranı olmaktan çıkarıldı
- bu route doğrudan `/dashboard/acik_istekler` sayfasına yönlendirir

Taşıyıcı navigasyonu:

- [CarrierVehiclesShell.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/components/CarrierVehiclesShell.tsx) genişletildi
- yeni linkler:
  - `Acik Istekler`
  - `Tekliflerim`

Teklif verme formu bağımsız sayfa yerine request detayında tutuldu. Bu tercih şu nedenlerle seçildi:

- teklif her zaman belirli bir request bağlamında veriliyor
- ekstra global `teklif_ver` akışı gereksiz karmaşa yaratıyordu
- kullanıcı önce request detayını görüp sonra teklif giriyor

Başarılı teklif sonrası kullanıcı `/dashboard/tekliflerim` ekranına yönlendirilir.

Müşteri tarafında:

- [isteklerim/[id]/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/isteklerim/[id]/page.tsx) içine `Gelen Teklifler` bölümü eklendi

# Teklif Durum / Status Yaklaşımı

Bu fazda offer başlangıç durumu sabit bir config kuralıyla çözülür:

- `durumTuru = TEKLIF`
- `durumAdi = OLUSTURULDU`

Magic numeric id kullanılmadı.

Bu kayıt DB'de yoksa service açık config hatası verir. Runtime auto-create yapılmaz.

Bu yüzden migration tarafında:

- `20260417133000_seed_roles_and_offer_status`

eklendi ve lokal DB'ye uygulandı.

# Role ve Ownership Kuralları

Register:

- `MUSTERI` register akışı araç alanı istemez
- `NAKLIYECI` register akışı ilk araç olmadan tamamlanmaz

Offers:

- açık istek listesi sadece `NAKLIYECI`
- açık istek detay/teklif verme sadece `NAKLIYECI`
- `my offers` sadece `NAKLIYECI`
- incoming offers sadece request sahibi `MUSTERI`

Ownership:

- taşıyıcı kendi request'ine teklif veremez
- müşteri sadece kendi request'ine gelen teklifleri görebilir

# Teklif Verilebilir Request Kuralı

Bu fazda bir request ancak şu koşullarda teklif verilebilir kabul edildi:

- `Istek.silmeTarihi = null`
- request durumu `ISTEK/OLUSTURULDU`
- request için `Nakliye` oluşmamış
- request taşıyıcının kendi request'i değil

Ayrıca teklif oluşturmak isteyen taşıyıcı için:

- en az bir aktif araç gerekir
- aynı taşıyıcı aynı request'e ikinci teklif veremez

Önemli UX kararı:

- araçsız taşıyıcı açık istek listesini ve detayını görebilir
- ama create bloklanır
- ekranda açık mesaj gösterilir:
  - `Teklif verebilmek için önce en az bir aktif aracınız olmalı.`

# Mevcut Request ve Vehicle Modülleriyle Uyum

Bu adım mevcut modülleri büyüttü ama bozmadı:

- `vehicles` create/list/detail/update/soft-delete akışı korundu
- `transport-requests` create/list/detail/update/soft-delete akışı korundu
- offers tarafı bu iki modülün üstüne yeni iş katmanı olarak eklendi

Register sırasında ilk araç kaydının gerçek yapılması, vehicles modülünü gereksiz kılmaz. Çünkü:

- register sadece ilk bootstrap aracını oluşturur
- sonrasındaki araç yönetimi yine resmi vehicles modülünden yapılır

Bu sayede:

- offers için gerekli "en az bir aktif araç" önkoşulu register anında doğal biçimde karşılanır
- araçsız nakliyeci kuralı artık daha çok legacy veri / bozuk kayıt fallback'i olarak kalır

# Test / Kontrol Sonuçları

Çalıştırılan komutlar:

- `npx prisma migrate dev` (`apps/api`)  
  Not: `20260417133000_seed_roles_and_offer_status` migration'ı uygulandı.
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Sonuç:

- API build geçti
- API lint geçti
- Web build geçti
- Web lint geçti

Register duplicate plaka davranışı:

- backend `409 Conflict`
- frontend mesajı:
  - `Bu plaka zaten aktif bir araca ait.`

# Bilinçli Olarak Yapılmayanlar

- teklif kabul etme
- teklif reddetme
- teklif geri çekme
- job / nakliye oluşturma
- aracı teklife bağlama
- bildirim sistemi
- puanlama entegrasyonu
- offers tarafına soft delete
- teklif filtreleme / arama / sayfalama
- register formunun büyük yeniden tasarımı
- SSR auth / cookie auth / middleware auth
- büyük dashboard redesign

# Sonraki Mantıklı Adım

Bir sonraki mantıklı faz:

- offer acceptance / rejection karar akışını açmak
- kabul edilen tekliften `Nakliye` oluşturma kuralını eklemek
- request `durum` ve offer `durum` geçişlerini netleştirmek
- aynı noktada job tarafını resmi olarak açmak
