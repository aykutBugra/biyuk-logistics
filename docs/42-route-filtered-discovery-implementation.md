# Amaç

Bu adımda `Açık İstekler` discovery davranışı ürün beklentisine göre düzeltildi. Daha önce route seçimi yalnızca mevcut listeyi etiketleyen bir overlay olarak çalışıyordu. Bu fazda route seçimi gerçek filtreye çevrildi.

Ana ürün sonucu şudur:

- nakliyeci route seçmezse discovery mevcut manuel filtrelerle çalışır
- nakliyeci route seçerse liste sadece seçili rota ve sapma limitiyle uyumlu talepleri gösterir
- suitability tabanlı taşıma uygunluğu bloğu discovery’den tamamen çıkarılır

# Bu Adımda Ne Değişti

- `carrierRouteId` seçimi discovery overlay’i olmaktan çıkarıldı, gerçek route filtresi oldu
- `Taşıma Uygunluğu / suitability` discovery listesi ve detayından kaldırıldı
- listede kalan route eşleşmeleri için `Rota Uyumu` bilgisi korunarak gösterilmeye devam edildi
- route filtre dışı kayıtlar artık etiketsiz görünmek yerine doğrudan listeden elendi
- route hesabı üretilemeyen teknik durumlar kart içine gömülmek yerine endpoint seviyesinde hata davranışına taşındı

# Backend Tarafında Yapılanlar

Backend tarafında suitability zinciri `offers` modülünden söküldü:

- `OpenRequestSuitabilityEvaluator` kaldırıldı
- `open-request-suitability-response.dto.ts` kaldırıldı
- open request list/detail response’larından `suitability` alanı çıkarıldı
- `offers.module.ts` içindeki suitability provider wiring’i kaldırıldı

Route-aware evaluator yeniden tanımlandı. Önceki akışta evaluator gevşek şekilde `null` döndürüyordu. Yeni akışta evaluator artık iç statü üretir:

- `MATCH`
- `OUTSIDE_ROUTE_FILTER`
- `UNAVAILABLE_DATA`
- `UNAVAILABLE_ROUTE_SERVICE`

Bu statüler doğrudan API response’una taşınmadı; `OffersService` içinde ürün davranışına çevrildi.

# Route Filtreleme Mantığı

Route seçildiğinde liste akışı iki aşamalı hale getirildi:

1. Mevcut manuel filtrelerle açık istekler veritabanından alınır.
2. Her kayıt için önce ucuz coarse prefilter çalışır.
3. Coarse prefilter’ı geçen kayıtlar için exact RouteEngine hesabı yapılır.
4. Exact hesap sonucu sapma limiti içinde kalanlar listede tutulur.
5. Limit dışında kalanlar route filtreden çıkarılır.

Coarse prefilter için kuş uçuşu alt sınır kullanıldı:

- `start -> pickup`
- `pickup -> dropoff`
- `dropoff -> end`
- eksi `start -> end`

Bu alt sınır seçili route üzerindeki açıkça alakasız talepleri erken elemek için kullanıldı. Böylece dış route çağrısı gereksiz yere her kayıt için çalıştırılmadı.

Exact rota hesabında mevcut foundation korundu:

- `start -> pickup -> dropoff -> end`
- `extraMesafeMetre = exactRouteDistance - baseRouteDistance`
- `extraSureSaniye = exactRouteDuration - baseRouteDuration`

# Hata ve Null Davranışı

Önceki implementasyonda route hesabı başarısız olduğunda kart içinde `Route uyumu hesaplanamadi` gösteriliyordu. Bu davranış discovery açısından teknik belirsizlik üretiyordu. Bu fazda o model kaldırıldı.

Yeni davranış:

- seçili rota snapshot’ı hazır değilse list/detail `409` döner
- request route context içinde değerlendirilemiyorsa detail `409` döner
- route provider veya upstream servis hata verirse list/detail `503` döner
- route filtresine uymayan kayıt detail route context’te `404` döner
- route seçili başarılı listede `rotaUyumu: null` kartı artık oluşmaz

Bu sayede `hesaplanamadi` ile `rota dışı` durumu birbirinden ayrıldı.

# Rota Uyumu Etiketi

`rotaUyumu` nesnesi korundu. Public shape değişmedi:

- `carrierRouteId`
- `extraMesafeMetre`
- `extraSureSaniye`
- `uygunlukEtiketi`

Etiket kuralları yeniden ayarlandı:

- `UYGUN`: sapma limitinin ilk `%80` bandı
- `SINIRDA`: sapma limitinin son `%20` bandı
- `UYGUN_DEGIL`: public başarılı route filtre response’unda serialize edilmez; bu kayıtlar zaten filtre dışına düşer

Route üzerinde `maksimumSapmaKm` yoksa default `20 km` limit kullanıldı.

# API ve Response Yüzeyi

Liste ve detay uçları route query paramını kullanmaya devam etti:

- `GET /api/v1/offers/open-requests?carrierRouteId=...`
- `GET /api/v1/offers/open-requests/:id?carrierRouteId=...`

Fakat response semantics değişti:

- route seçilmemişse mevcut discovery listesi döner
- route seçilmişse yalnızca route filtresinden geçen kayıtlar döner
- `suitability` response’tan çıkarıldı
- route seçili başarılı response’ta kalan kayıtların `rotaUyumu` alanı dolu döner

# Web Tarafında Yapılanlar

Liste ekranında:

- `Rota baglami` başlığı `Rota filtresi` olarak değiştirildi
- açıklama metni route seçiminden sonra listenin daraldığını söyleyecek şekilde düzeltildi
- `Taşıma Uygunluğu` bloğu tamamen kaldırıldı
- route seçili kartlarda yalnızca `Rota Uyumu` satırı bırakıldı
- `Route uyumu hesaplanamadi` kart içi metni kaldırıldı
- route filter `503` durumu sayfa seviyesinde hata mesajına taşındı
- boş durum metni route filtresi aktifken ayrı ifade edecek şekilde güncellendi

Detay ekranında:

- `Taşıma uygunlugu` kartı kaldırıldı
- `Secili rota` ve `Rota uyumu` kartları bırakıldı
- route context ile açılan ve filtre dışı kalan istek için listeye geri yönlendirme eklendi
- selected vehicle dropdown ve fiyat önerisi davranışı korunarak bırakıldı

# Bilinçli Olarak Yapılmayanlar

Bu fazda özellikle şunlar eklenmedi:

- ayrı ara güzergah butonu
- suitability’yi selected vehicle mantığına taşıma
- ranking
- route skoruna göre sıralama
- otomatik gizleme dışında ikinci bir discovery motoru
- teklif fiyatı davranışını route filtresine bağlama

Buradaki amaç yeni bir matching sistemi açmak değil, route seçimini önce doğru ürün davranışına oturtmaktı.

# Test / Kontrol Sonuçları

Bu implementasyon sonrasında şu kontroller çalıştırıldı ve geçti:

- `npm run build:api`
- `npm run build:web`
- `npm run lint:api`
- `npm run lint:web`

Bu sonuç route evaluator refactor’ının, DTO sadeleştirmesinin ve web liste/detay temizliğinin derleme seviyesinde uyumlu olduğunu doğruladı.

# Sonraki Mantıklı Adım

Bu adımdan sonraki mantıklı iş, route filtre davranışı doğru çalışırken corridor üstü talepler için daha güvenilir pass-through değerlendirmesini güçlendirmek ve gerekiyorsa bunun üstüne sıralama mantığı açmaktır. Suitability discovery’ye geri dönecekse selected vehicle veya teklif anı bağlamında yeniden tasarlanmalıdır; filo bazlı discovery etiketi olarak aynı model tekrar kullanılmamalıdır.
