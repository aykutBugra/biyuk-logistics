# Amaç

Bu adımın amacı, mevcut request akışına başlangıç ve varış canonical konumları arasındaki gerçek yol mesafesi ve süre bilgisini eklemektir. Bu foundation sadece rota verisini üretir, saklar ve response yüzeyine taşır; fiyat önerisi veya rota sapması mantığı eklemez.

# Bu Adımda Ne Değişti

- `Istek` modeline ham rota metrikleri eklendi: `rotaMesafeMetre`, `rotaSureSaniye`
- Request create akışında canonical konumlar çözüldükten sonra gerçek yol metrikleri hesaplanıp kayıtla birlikte saklanır hale geldi
- Request update akışında başlangıç veya varış konumu değiştiğinde rota metrikleri yeniden hesaplanır hale geldi
- Konum değişmiyorsa request update akışı gereksiz route hesabı yapmadan mevcut rota metriklerini korur hale geldi
- Transport request list/detail ve open request list/detail response yüzeylerine rota metrikleri taşındı
- Web API tipleri yeni ham alanları okuyacak şekilde güncellendi

# Neden Routes API Kullanıldı

Bu adımda kuşbakışı mesafe veya lat/lng farkı kullanılmadı. Mevcut `RouteEngine` kontratı üzerinden Google Routes API çağrılarak araç yoluna göre `distanceMeters` ve `duration` alındı.

Bu tercih şu nedenlerle yapıldı:

- İleride route-aware discovery ve sapma hesabı aynı temel üstüne kurulabilecek
- Teklif ekranında elle yazılacak fiyat önerisi için gerçek yol bazlı veri sağlanacak
- Domain katmanına Google response shape yayılmadan sadece canonical metrikler taşınacak

# Request Create Akışında Mesafe Hesabı

Request create sırasında backend şu sırayı izler:

1. Başlangıç ve varış canonical place seçimi `LocationProvider` üzerinden çözülür
2. Çözülen canonical lat/lng değerleri `RouteEngine` ile Google Routes API'ye gönderilir
3. Dönen gerçek yol mesafesi ve süre `rotaMesafeMetre` ve `rotaSureSaniye` alanlarına çevrilir
4. Request kaydı aynı transaction akışı içinde rota metrikleriyle birlikte DB'ye yazılır

Bu adımda seçilen hata davranışı nettir: route hesabı başarısızsa create açık hata ile durur. Null/fallback ile sessiz yanlış kayıt oluşturulmaz.

# Request Update Akışında Yeniden Hesaplama Kuralı

Update akışında önce gelen `provider/placeId` çiftleri mevcut request kaydıyla karşılaştırılır.

- Başlangıç veya varış konumu değişmişse:
  gerçek canonical konumlar yeniden çözülür, route yeniden hesaplanır ve rota metrikleri overwrite edilir
- Konumlar değişmemişse:
  route hesabı yeniden yapılmaz, mevcut rota metrikleri olduğu gibi korunur

Bu sayede gereksiz Google Routes çağrısı yapılmaz ve sadece konum değişikliği route recalculation tetikler.

# Veritabanında Saklanan Rota Metrikleri

`Istek` tablosunda şu ham alanlar saklanır:

- `rotaMesafeMetre` `INTEGER`
- `rotaSureSaniye` `INTEGER`

Alanlar nullable tutuldu. Bu, mevcut eski kayıtlar için geriye dönük backfill zorlamamak içindir. Yeni oluşturulan veya konumu değiştirilen request kayıtlarında bu alanlar doldurulur.

Bu adımda bilinçli olarak şu alanlar eklenmedi:

- `rotaMesafeKm`
- `rotaSureDakika`
- `rotaSaglayici`
- `rotaHesaplamaTarihi`

# API Response Yüzeyine Eklenen Alanlar

Şu response yüzeylerine yeni alanlar eklendi:

- `POST /transport-requests`
- `PUT /transport-requests/:id`
- `GET /transport-requests/my`
- `GET /transport-requests/:id`
- `GET /offers/open-requests`
- `GET /offers/open-requests/:id`

Eklenen ham alanlar:

- `rotaMesafeMetre`
- `rotaSureSaniye`

Bu adımda türetilmiş `km` veya `dakika` alanları response'a eklenmedi.

# Fiyat Önerisi İçin Hazırlanan Veri Temeli

Teklif verme ekranında kullanılan open request detail/read modeli artık request’in ham rota metriklerini taşır. Böylece sonraki adımda fiyat önerisi business logic'i yazılırken gerekli mesafe ve süre verisi hazırdır.

Bu adımda özellikle yapılmadı:

- teklif fiyatı hesaplama fonksiyonu
- önerilen fiyat business logic'i
- teklif formuna otomatik fiyat yazdırma

# Hata Yönetimi Kararları

Route hesabı için fail-fast yaklaşımı seçildi.

- Google Routes çağrısı başarısızsa request create durur
- Konum değişen request update başarısız olur
- Geçersiz veya eksik Google route payload'ı kabul edilmez
- `0` veya `NaN` sessiz fallback olarak yazılmaz
- Domain response katmanına Google’ın ham response yapısı taşınmaz

Ek olarak route engine doğrulaması sıkılaştırıldı:

- `distanceMeters` sayısal ve negatif olmayan değer olmalı
- `duration` geçerli bir saniye ifadesine parse edilebilmeli

# Test / Kontrol Sonuçları

Uygulama sonrası şu kontroller çalıştırıldı ve başarılı geçti:

- `npm run prisma:generate`
- migration SQL DB'ye uygulandı ve migration history'ye işlendi
- `rotaMesafeMetre` ve `rotaSureSaniye` kolonlarının DB'de `integer` olarak oluştuğu doğrulandı
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Not:

- Yeni migration dosyası eklendi: `20260422120000_add_request_route_distance_foundation`
- Bu migration veritabanına hotfix akışıyla uygulandı ve Prisma migration history'ye işlendi

# Bilinçli Olarak Yapılmayanlar

Bu adımda özellikle yapılmadı:

- fiyat önerisi hesaplama algoritması
- teklif ekranında otomatik fiyat yazma
- rota sapması / ara güzergah hesabı
- pickup/dropoff ekstra km hesabı
- çoklu durak desteği
- ranking / matching
- nakliyeci rota tanımı
- UI redesign
- yeni büyük discovery fazı
- mevcut eski request kayıtları için toplu route backfill

# Sonraki Mantıklı Adım

Sonraki mantıklı adım, bu foundation üstüne sadece tüketici tarafı business logic eklemektir:

- offer/request detail response'undaki `rotaMesafeMetre` ve `rotaSureSaniye` alanlarını kullanarak elle yazılacak fiyat önerisi fonksiyonu eklemek
- bunu yaparken mevcut route foundation'ı tekrar genişletmeden, sadece fiyat önerisi için ayrı bir hesaplama katmanı kurmak
