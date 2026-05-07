# Amaç

Bu adımın amacı, mevcut `Açık İstekler` discovery akışına opsiyonel bir taşıyıcı rota bağlamı ekleyip açık istekleri seçili rota üzerinden değerlendirebilir hale getirmekti. Eklenen MVP, tam bir matching veya ranking motoru kurmadı; bunun yerine mevcut discovery sonucunun üstüne sade bir route-aware okuma katmanı koydu.

Bu fazın resmi çıktısı dört parçadan oluştu:

- seçili `carrierRouteId` bağlamı
- `extraMesafeMetre`
- `extraSureSaniye`
- `uygunlukEtiketi`

Mevcut discovery filtreleri, mevcut sıralama mantığı ve teklif oluşturma akışı korunarak ilerlenmiştir.

# Bu Adımda Ne Değişti

- `GET /offers/open-requests` endpointi opsiyonel `carrierRouteId` query paramı kabul eder hale geldi.
- `GET /offers/open-requests/:id` detay endpointi de aynı route bağlamını okuyacak şekilde genişletildi.
- Open requests response yüzeylerine yeni nullable `rotaUyumu` nesnesi eklendi.
- `offers` modülü içine route-aware hesapları yapan ayrı bir evaluator servisi yerleştirildi.
- `carrier-routes` modülü read amaçlı `offers` tarafına açıldı.
- Open request listesi için iç repository kaydına canonical koordinat ve provider alanları taşındı.
- Web tarafında `Açık İstekler` liste ekranına rota seçimi ve rota özet kartı eklendi.
- Web tarafında açık istek kartları ve detay ekranı route-aware metrikleri gösterecek şekilde genişletildi.
- Route seçimi URL query param ile taşınır hale getirildi; liste ve detay aynı bağlamı paylaşır oldu.

# Route-Aware Discovery Neden Bu Şekilde Eklendi

Bu implementasyonda route seçimi opsiyonel bırakıldı. Sebep, mevcut discovery ekranını bozup erken sert filtreleme yapmak yerine önce taşıyıcıya karar destek sinyali üretmekti. Route seçilmediğinde sistemin bugünkü davranışı aynen devam eder; route seçildiğinde ise aynı kayıtların üstüne ek metrikler bindirilir.

Bu yaklaşım özellikle üç nedenle seçildi:

- mevcut discovery davranışı kırılmadan korunur
- ranking açmadan önce gerçek ek km ve ek süre sinyali görünür hale gelir
- taşıyıcı, seçtiği hat bağlamında yükün ana rotayı ne kadar bozduğunu somut olarak okuyabilir

# Backend Tarafında Yapılanlar

Backend tarafında route-aware mantık repository içine gömülmedi. Bunun yerine `offers` modülü içinde ayrı bir `OpenRequestRouteAwareEvaluator` servisi açıldı.

Bu kararın nedeni nettir:

- repository yalnızca veritabanı okumaya devam etti
- dış servis çağrısı ve iş kuralı aynı yerde toplanmadı
- mevcut open request sorgu yapısı minimum değişiklikle korunmuş oldu

Eklenen ana backend yüzeyleri:

- `apps/api/src/modules/offers/dto/open-request-detail-query.dto.ts`
- `apps/api/src/modules/offers/dto/open-request-route-compatibility-response.dto.ts`
- `apps/api/src/modules/offers/open-request-route-aware-evaluator.service.ts`

Genişletilen ana yüzeyler:

- `apps/api/src/modules/offers/offers.controller.ts`
- `apps/api/src/modules/offers/offers.service.ts`
- `apps/api/src/modules/offers/offers.module.ts`
- `apps/api/src/modules/offers/dto/open-request-query.dto.ts`
- `apps/api/src/modules/offers/dto/open-request-list-item-response.dto.ts`
- `apps/api/src/modules/offers/repositories/offers.repository.ts`
- `apps/api/src/modules/carrier-routes/carrier-routes.module.ts`

# API Yüzeyine Eklenenler

Liste ve detay uçları opsiyonel `carrierRouteId` taşır hale geldi:

- `GET /api/v1/offers/open-requests?carrierRouteId=...`
- `GET /api/v1/offers/open-requests/:id?carrierRouteId=...`

Bu query param geldiğinde backend önce giriş yapan nakliyecinin gerçekten o route’un sahibi olup olmadığını `CarrierRoutesService.getMineById(...)` üzerinden doğrular. Böylece route-aware hesap yalnızca owner-scoped kayıtlar üstünde çalışır.

Response tarafında hem liste hem detay modeli aynı yeni alanı taşır:

- `rotaUyumu`

Bu nesnenin alanları:

- `carrierRouteId`
- `extraMesafeMetre`
- `extraSureSaniye`
- `uygunlukEtiketi`

Bilinçli karar olarak response’a şunlar eklenmedi:

- `extraMesafeKm`
- `extraSureDakika`
- `routeAwareMi`
- `hesaplananYeniToplamRotaMesafesi`

Sebep, API yüzeyini ham domain verisiyle sınırlı tutmak ve presentation formatını frontend helper katmanında çözmektir.

# Rota Uyumu Hesaplama Mantığı

Route-aware evaluator şu mantıkla çalışır:

1. seçili taşıyıcı rotasının ana rota metriğini okur
2. request pickup ve dropoff canonical koordinatlarını okur
3. `start -> pickup -> dropoff -> end` sırasıyla yeni bir rota hesabı yapar
4. yeni rota ile ana rota arasındaki farkı çıkarır

Kullanılan formül:

- `extraMesafeMetre = max(0, yeniRotaMesafesi - anaRotaMesafesi)`
- `extraSureSaniye = max(0, yeniRotaSuresi - anaRotaSuresi)`

Bu hesap `LocationsService.getRouteMetrics(...)` üzerinden yapılır. Yani route hesabı, request tarafında zaten kullanılan mevcut RouteEngine foundation üstüne bağlandı; ayrı bir geospatial kısayol veya kuşbakışı hesap açılmadı.

Bu adımda sadece tek bir yeni rota hesabı yapıldı. Şunlar özellikle eklenmedi:

- sapma yüzdesi
- ters yön / istikamet analizi
- alternatif waypoint denemeleri
- otomatik toplam skor

# Null ve Hata Davranışı

Bu fazda fail-open davranışı seçildi. Amaç, route-aware hesap eksik kaldığında discovery ekranını kırmamak ve yanlış zorlamayla dış servis maliyeti üretmemekti.

Şu durumlarda `RouteEngine` hiç çağrılmadan doğrudan `rotaUyumu: null` dönülür:

- request tarafında canonical koordinat snapshot alanı eksikse
- carrier route tarafında canonical koordinat snapshot alanı eksikse
- carrier route üzerinde `rotaMesafeMetre` veya `rotaSureSaniye` eksikse
- provider bilgileri eksikse
- provider değerleri aynı route hesabı için tutarlı değilse

Ek olarak dış rota çağrısı hata verirse tek bir kayıt yüzünden tüm discovery listesi düşürülmez. İlgili kayıt için yine `rotaUyumu: null` döner. Bu tercih, route-aware katmanın mevcut discovery’nin üstüne ek bir zeka katmanı olması ve ana listeyi sahiplenmemesi nedeniyle seçildi.

# Uygunluk Etiketi Nasıl Kuruldu

Bu adımda karmaşık skor yerine üç seviyeli sade bir etiket eklendi:

- `UYGUN`
- `SINIRDA`
- `UYGUN_DEGIL`

Etiket yalnızca `extra km` üstünden üretildi. `extraSureSaniye` görünürlük için tutuldu ama karar verici yapılmadı.

Kural seti:

- route üzerinde `maksimumSapmaKm` varsa önce bu değer kullanılır
- `extraKm <= maksimumSapmaKm` ise `UYGUN`
- `extraKm <= maksimumSapmaKm + 15` ise `SINIRDA`
- aksi halde `UYGUN_DEGIL`

Rota üzerinde `maksimumSapmaKm` yoksa sistem default bantlara düşer:

- `0-20 km` `UYGUN`
- `20-40 km` `SINIRDA`
- `40 km+` `UYGUN_DEGIL`

Bu sade model özellikle ranking motoru açmadan önce taşıyıcının ek sapmayı hızlı okuyabilmesi için seçildi.

# Frontend Tarafında Yapılanlar

Web tarafında iki ana ekran route-aware discovery’ye bağlandı:

- `apps/web/src/app/dashboard/acik_istekler/page.tsx`
- `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`

Liste ekranında:

- taşıyıcının kayıtlı rotaları `GET /carrier-routes/my` ile yüklenir
- üst alana rota seçici yerleştirilir
- route seçildiğinde kısa bir özet kart gösterilir
- request kartlarında yeni route-aware satır görünür

Detay ekranında:

- aynı `carrierRouteId` query paramı okunur
- request detayı bu bağlamla tekrar çekilir
- seçili rota özeti ayrıca yüklenir
- teklif formunun üstünde route-aware değerlendirme kartı gösterilir

Bu ekranlar `useSearchParams` kullandığı için App Router tarafında `Suspense` sınırıyla sarıldı. Böylece route query paramı kullanan client ekranlar build sırasında kararlı kaldı.

# Query Param ve Sayfa Davranışı

Route seçimi URL üzerinden taşınır hale getirildi:

- liste: `/dashboard/acik_istekler?carrierRouteId=...`
- detay: `/dashboard/acik_istekler/[id]?carrierRouteId=...`

Bu yaklaşım şu nedenlerle seçildi:

- refresh sonrası seçili bağlam korunur
- liste ve detay aynı route bağlamını paylaşır
- ekstra global state ihtiyacı doğmaz

Ek davranışlar:

- route seçimi mevcut discovery filtrelerini sıfırlamaz
- route temizlenirse ekran eski discovery moduna döner
- route ID geçersizse veya kullanıcıya ait değilse frontend query paramı temizleyip normal discovery’ye geri düşer

# UI Gösterim Kararları

Backend yalnızca ham metre ve saniye döner. UI tarafında gösterim helper ile formatlanır:

- `formatRouteDistanceKm(...)`
- `formatRouteDuration(...)`

Bu karar özellikle şu nedenle korundu:

- API presentation alanlarıyla şişmedi
- km/dk formatı web katmanında tek çizgide kaldı
- aynı ham veri farklı ekranlarda farklı görsel ihtiyaca göre yeniden kullanılabilir oldu

Liste kartlarında gösterilen yeni sinyaller:

- uygunluk badge’i
- `Ek +X km`
- `Ek +Y dk`

Detay ekranında gösterilen yeni sinyaller:

- seçili rota özeti
- route-aware uygunluk etiketi
- ekstra mesafe
- ekstra süre

Route-aware hesap yoksa nötr bir bilgi satırı gösterilir; teklif akışı bloklanmaz.

# Test / Kontrol Sonuçları

Bu implementasyon sonrası şu doğrulamalar çalıştırıldı ve geçti:

- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Bu sonuç, yeni DTO, evaluator, query param akışı ve App Router tarafındaki route seçimi entegrasyonunun derleme ve lint seviyesinde temiz olduğunu doğruladı.

# Bilinçli Olarak Yapılmayanlar

Bu fazda özellikle eklenmeyenler:

- otomatik ranking
- listeyi route skoruna göre yeniden sıralama
- `UYGUN_DEGIL` kayıtları otomatik gizleme
- route seçimini sert filtreye çevirme
- çoklu durak / çoklu yük optimizasyonu
- dönüş rotası
- harita üstünde canlı çizim
- kapasite, hacim ve araç seçimini route-aware skora katma
- otomatik teklif fiyatı yazma
- backend response’a türetilmiş `km/dakika` alanları ekleme

Bu sınır bilinçli korundu; çünkü amaç discovery’yi bir anda tam otomatik motor haline getirmek değil, mevcut karar yüzeyine güvenilir bir rota sapma sinyali eklemekti.

# Sonraki Mantıklı Adım

Bu adımdan sonraki mantıklı faz, route-aware sinyali diğer uygunluk sinyalleriyle birleştirmektir. En savunulabilir sıradaki genişleme:

- `rotaUyumu`
- araç kapasitesi
- hacim
- kasa tipi
- `tekTasimaIstiyor`

alanlarını aynı discovery okumasında yan yana taşıyan daha zengin bir suitability katmanı kurmaktır. Yani bir sonraki adım doğrudan ranking değil, route-aware metriği kapasite ve yük kısıtlarıyla birlikte okunabilir hale getirmek olmalıdır.
