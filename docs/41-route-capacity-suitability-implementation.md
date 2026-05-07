# Amaç

Bu adımın amacı, mevcut route-aware discovery katmanının üstüne ikinci bir uygunluk okuması eklemekti. Sistem artık yalnızca seçili rota bağlamında ek km ve ek süreyi göstermiyor; aynı zamanda aktif araç filosu içinde bu yükü taşıyabilecek aday olup olmadığını da discovery yüzeyine taşıyor.

Bu fazda yeni bir ranking motoru açılmadı. Eklenen şey, mevcut `rotaUyumu` nesnesinin yanına ikinci bir `suitability` nesnesi koyan karar destek katmanıdır.

# Bu Adımda Ne Değişti

- Open request list ve detail response’larına yeni `suitability` alanı eklendi.
- `offers` modülü içine route evaluator’dan ayrı bir `OpenRequestSuitabilityEvaluator` servisi eklendi.
- Suitability hesabı route seçili bağlamda aktif araç filosu üstünden çalışır hale geldi.
- Liste ve detay ekranlarında route uyumu yanında taşıma uygunluğu kartları açıldı.
- Uygunluk hesabı selected vehicle üstünden değil, “aktif araçlarım içinde uygun aday var mı?” mantığıyla kuruldu.
- Tahmini fiyat kutusu ve offer formundaki selected vehicle akışı korunarak bırakıldı.

# Backend Tarafında Yapılanlar

Backend tarafında suitability mantığı `offers` modülü içinde ikinci evaluator olarak yerleştirildi:

- `apps/api/src/modules/offers/open-request-suitability-evaluator.service.ts`
- `apps/api/src/modules/offers/dto/open-request-suitability-response.dto.ts`

Mevcut route-aware evaluator korundu. Böylece iki sorumluluk ayrıldı:

- `OpenRequestRouteAwareEvaluator`: rota sapması
- `OpenRequestSuitabilityEvaluator`: rota + kapasite + operasyonel dikkat okuması

`OffersRepository` içine aktif araç filosunu tek seferde okuyan yeni read yüzeyi eklendi. Böylece suitability için her request başına ayrı araç sorgusu açılmadı.

# Suitability Hesap Mantığı

Suitability hesabı şu sinyalleri üretir:

- `toplamAktifAracSayisi`
- `uygunAracSayisi`
- `agirlikUyumu`
- `hacimUyumu`
- `kasaTipiUyumu`
- `tekTasimaUyumu`
- `genelSuitabilityEtiketi`

Temel kurallar:

- ağırlık ve hacim için en az bir aktif araç request yükünü karşılıyorsa `UYGUN`
- request ağırlık veya hacim verisi eksikse ilgili sinyal `DIKKAT`
- hiçbir aktif araç ilgili kapasiteyi karşılamıyorsa `UYGUN_DEGIL`
- `tekTasimaIstiyor=true` ise sert blok yerine `DIKKAT`
- `request.yukTipi` eksik veya belirsizse `kasaTipiUyumu` hiçbir zaman `UYGUN` üretmez; doğrudan `DIKKAT` üretir

`uygunAracSayisi`, yalnızca sert kapasite kontrollerini geçen araçları sayar. Kasa tipi ve tek taşıma bu sayının içine sert filtre olarak dahil edilmedi.

# API Yüzeyi

Hem list hem detail response’larına şu yeni nullable nesne eklendi:

- `suitability`

Bu nesnenin alanları:

- `toplamAktifAracSayisi`
- `uygunAracSayisi`
- `agirlikUyumu`
- `hacimUyumu`
- `kasaTipiUyumu`
- `tekTasimaUyumu`
- `genelSuitabilityEtiketi`

Bu adımda response’a presentation amaçlı türetilmiş alanlar eklenmedi. `extraMesafeKm`, `extraSureDakika` benzeri alanlarda olduğu gibi suitability tarafında da ham ve sade domain shape korundu.

# Web Tarafında Açılan Yüzey

Suitability görselleştirmesi iki ekranda açıldı:

- `apps/web/src/app/dashboard/acik_istekler/page.tsx`
- `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`

Liste ekranında:

- route seçiliyse her kartta `Rota uyumu` altında ikinci bir `Tasima uygunlugu` bloğu görünür
- genel suitability etiketi ve uygun araç sayısı gösterilir
- ağırlık, hacim, kasa tipi ve tek taşıma sinyalleri kısa chip olarak görünür

Detay ekranında:

- route özeti ve route-aware kartının yanına ayrı bir suitability kartı eklendi
- offer formu ve tahmini fiyat kutusu korunarak bırakıldı
- selected vehicle dropdown’ı suitability’nin ön koşulu yapılmadı

# Performans Kararı

Bu fazda suitability için yeni dış servis çağrısı açılmadı. En pahalı iş yine route-aware evaluator’daki rota hesabı olarak kaldı.

Performans tarafında seçilen yaklaşım:

- route seçilmemişse suitability hiç çalışmaz
- aktif araçlar request başına değil, HTTP isteği başına tek seferde okunur
- suitability tamamen memory içinde request x vehicle karşılaştırmasıyla üretilir

Bu sayede yeni katman discovery’ye eklenirken maliyet kontrollü tutuldu.

# Test / Kontrol Sonuçları

Uygulama sonrası şu doğrulamalar çalıştırıldı ve geçti:

- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Bu kontroller yeni suitability DTO’sunun, evaluator zincirinin ve web liste/detay entegrasyonunun derleme seviyesinde temiz olduğunu doğruladı.

# Bilinçli Olarak Yapılmayanlar

Bu fazda özellikle eklenmeyenler:

- ranking
- suitability skoruna göre sıralama
- selected-vehicle-specific suitability
- otomatik gizleme
- otomatik teklif fiyatı yazma
- boyut bazlı 3D yerleşim hesabı
- harita görselleştirme
- mesajlaşma / pazarlık

# Sonraki Mantıklı Adım

Bu adımdan sonraki en mantıklı büyük faz, `rotaUyumu` ve `suitability` sinyallerini kullanarak çok sinyalli discovery ranking açmaktır. Çünkü route sapması ve taşıma yapılabilirliği artık aynı discovery yüzeyinde görünür hale geldi; bundan sonraki değer artışı bu sinyalleri sıralama mantığına çevirmek olacaktır.
