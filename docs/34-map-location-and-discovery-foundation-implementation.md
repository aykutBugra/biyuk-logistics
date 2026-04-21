# Amaç

Bu adımda harita, konum doğrulama ve discovery foundation fazı tek seferde kuruldu. Hedef; manuel `lat/lng` girişinden çıkmak, request ve vehicle veri modelini rota-zeka için hazırlamak, `tekTasimaIstiyor` alanını domain bilgisi olarak yerleştirmek ve `Acik Istekler` ekranında gerçek çalışan ilk filtreli discovery yapısını açmaktı.

# Bu Adımda Ne Değişti

- API tarafına yeni `locations` modülü eklendi.
- Google ile başlayan ama provider-agnostic kalan `LocationProvider` ve `RouteEngine` kontratları kuruldu.
- request create/update akışı artık place selection üzerinden doğrulanmış konum yazar hale geldi.
- `Istek` modeli canonical konum, structured yük ve discovery alanlarıyla zenginleştirildi.
- `Arac` modeli tonajdan çıkarılıp ağırlık, hacim, kasa tipi ve temel boyut alanlarıyla genişletildi.
- müşteri request create/edit ekranlarında manuel koordinat alanları kaldırıldı.
- `Acik Istekler` sayfasında çalışan filtreler açıldı.
- carrier ve customer detay ekranları yeni structured veriyi gösterecek şekilde güncellendi.

# Sağlayıcı Kararı ve Soyut Mimari

Bu implementasyonda başlangıç sağlayıcısı olarak Google seçildi, ancak kod seviyesi Google response shape’ine gömülmedi.

Eklenen temel yapı:

- `apps/api/src/modules/locations/location-provider.contract.ts`
- `apps/api/src/modules/locations/route-engine.contract.ts`
- `apps/api/src/modules/locations/google/google-location.provider.ts`
- `apps/api/src/modules/locations/google/google-route.engine.ts`

Kullanılan Google parçaları:

- Places Autocomplete
- Place Details
- Routes API yalnızca temel engine hazırlığı için

Çağrı modeli backend proxy olarak kuruldu:

- `GET /api/v1/locations/autocomplete?q=...`
- `GET /api/v1/locations/places/:placeId`

Web tarafı Google’a doğrudan gitmiyor; API anahtarı yalnızca backend config içinde kalıyor.

# LocationProvider ve RouteEngine Yapısı

Bu fazda iki ayrı soyut katman kuruldu:

- `LocationProvider`
  - autocomplete
  - place details
  - canonical location üretimi
- `RouteEngine`
  - iki nokta arası yol metrikleri kontratı
  - şu an yalnızca foundation seviyesi hazırlık

Önemli karar:

- `RouteEngine` gerçek discovery, offer veya job akışına bağlanmadı
- ara güzergah / sapma / ekstra km algoritması özellikle açılmadı

Bu ayrım sayesinde konum toplama ile rota zekası aynı kod yüzeyine karışmadı.

# Request Veri Modelinde Yapılan Değişiklikler

`Istek` modeline şu alanlar eklendi:

- `baslangicKonumMetni`
- `varisKonumMetni`
- `baslangicProvider`
- `varisProvider`
- `baslangicPlaceId`
- `varisPlaceId`
- `normalizeBaslangicSehir`
- `normalizeVarisSehir`
- `normalizeBaslangicIlce`
- `normalizeVarisIlce`
- `tekTasimaIstiyor`
- `agirlikKg`
- `hacimM3`
- `yukTipi`
- `tasimaTarihi`

Mevcut alanlar korunmaya devam etti:

- `baslangicSehri`
- `varisSehri`
- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`
- `yukDetay`

Ama yeni create/update akışı bunları artık serbest kullanıcı girdisinden değil, seçilen canonical place bilgisinden dolduruyor.

Transport request API ve servis yüzeyleri buna göre güncellendi:

- DTO’lar
- repository select/map yapısı
- create/update service akışı
- detail/list response shape’i

# Vehicle Veri Modelinde Yapılan Değişiklikler

`Arac` modeli artık yalnızca eski `kapasite` alanına dayanmıyor. Yeni model:

- `maksimumAgirlikKg`
- `maksimumHacimM3`
- `kasaTipi`
- `uzunlukCm`
- `genislikCm`
- `yukseklikCm`

Bu değişiklik backend, auth register akışı ve web form yüzeylerine taşındı:

- araç ekle
- araç düzenle
- araç listesi
- araç detayı
- nakliyeci kayıt sırasında ilk araç oluşturma

Bu fazda kapasite eşleşmesi henüz otomatik yapılmıyor; ama veri temeli artık tonaj dışında hacim ve fiziksel sığma yönüne hazırlanmış durumda.

# Manuel Koordinat Girişinden Çıkış

Müşteri request create/edit ekranlarında şu eski yüzey kaldırıldı:

- serbest şehir metni
- manuel enlem
- manuel boylam

Yerine:

- `LocationAutocompleteField`
- backend proxy autocomplete
- place selection sonrası canonical konum kartı

Legacy kayıtlar için edit davranışı kontrollü bırakıldı:

- place/provider bilgisi olan kayıtlar seçili canonical konumla açılıyor
- eski kayıt place/provider taşımıyorsa mevcut rota özeti gösteriliyor
- fakat kaydetmeden önce yeni konum seçimi isteniyor

# Tek Taşıma İsterim Alanı

`tekTasimaIstiyor` artık resmi request domain alanı olarak sisteme girdi.

Bu alan:

- request create/edit formunda yazılıyor
- request detail ekranında gösteriliyor
- open requests discovery filtresinde çalışıyor
- carrier discovery/detail ekranında görünür hale geliyor

Bu fazda bu alanın rolü:

- dedicated shipment sinyali üretmek

Bu fazda özellikle yapılmadı:

- çoklu yük optimizasyonu
- teklif verme sırasında sert otomatik blok
- otomatik match motorunda constraint olarak kullanma

# Açık İstekler Filtreli Discovery Yapısı

`Acik Istekler` sayfası artık yalnızca placeholder toolbar taşımıyor. Gerçek çalışan ilk filtre katmanı açıldı.

Çalışan filtreler:

- `baslangicSehir`
- `varisSehir`
- `tekTasimaIstiyor`
- `minAgirlikKg`
- `maxAgirlikKg`
- `minHacimM3`
- `maxHacimM3`
- `yukTipi`
- `tasimaTarihi`

Bu filtreler:

- frontend formundan query param olarak gidiyor
- backend repository seviyesinde uygulanıyor
- normalize şehir alanlarını fallback ile kullanıyor

Ek olarak discovery kartları artık şu structured alanları gösteriyor:

- canonical başlangıç/varış konumu
- yük tipi
- ağırlık
- hacim
- tek taşıma tercihi
- taşıma tarihi

# Backward Compatibility ve Migration Notları

Bu adımda schema güncellendi ve migration SQL dosyası eklendi:

- `apps/api/prisma/migrations/20260420110000_add_map_location_and_discovery_foundation/migration.sql`

Migration stratejisi:

- `Arac.kapasite` alanından `maksimumAgirlikKg` alanına backfill yapılır
- `maksimumAgirlikKg = kapasite * 1000`
- sonra eski `kapasite` kolonu düşer
- `Istek` için yeni canonical ve discovery alanları eklenir
- mevcut kayıtlar için `baslangicKonumMetni`, `varisKonumMetni` ve normalize şehir alanları mevcut şehir metninden doldurulur

Bu adımda migration komutu çalıştırılmadı. Lokalde çalıştırılması beklenen çizgi:

1. migration’ı uygula
2. `npm run prisma:generate`

Backward compatibility notu:

- eski kayıtlar okunabilir kalır
- yeni create/update akışı doğrulanmış place modeliyle yazar
- legacy request edit ekranı gerektiğinde yeniden konum seçimi ister

# Test / Kontrol Sonuçları

Bu adım sonunda çalıştırılan doğrulamalar:

- `npm run prisma:generate`
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Sonuç:

- hepsi geçti

Bilerek çalıştırılmayan komut:

- `prisma migrate dev`
- `prisma migrate deploy`

Sebep:

- bu adımda migration komutlarını kullanıcının lokalde çalıştırması istendi

# Bilinçli Olarak Yapılmayanlar

Bu foundation fazında özellikle yapılmadı:

- rota sapması / ara güzergah algoritmasının gerçek implementasyonu
- ekstra km / ekstra süre karar motoru
- çoklu yük optimizasyonu
- otomatik ranking / matching
- canlı mesajlaşma
- dinamik teklif pazarlığı
- gelişmiş geospatial optimizasyon
- çoklu durak / dönüş rotası
- PrimeReact veya büyük UI redesign
- pagination / gelişmiş arama motoru

# Sonraki Mantıklı Adım

Bu adımdan sonraki mantıklı büyük adım:

1. taşıyıcı için rota tanımı veya planlanan hat bilgisini açmak
2. `RouteEngine` kontratını gerçek discovery kararına bağlamak
3. ilk sade rota uyumu metriklerini eklemek

İlk açılması gereken metrikler:

- gerçek yol bazlı mesafe
- gerçek yol bazlı süre
- pickup/dropoff eklendiğinde ekstra km
- pickup/dropoff eklendiğinde ekstra süre

Yani sonraki fazın doğru sorusu artık “konumu nasıl doğrulayacağız?” değil, “doğrulanmış noktalar üstünden route-aware discovery’yi hangi sadelikte açacağız?” olacaktır.
