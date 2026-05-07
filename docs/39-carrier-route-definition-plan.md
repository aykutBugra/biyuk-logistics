# Carrier Routes Implementation Report

## Amaç
Bu adımda nakliyecinin kendi planlanan hattını sistemde kalıcı bir domain nesnesi olarak tanımlayabildiği `carrier-routes` fazı kuruldu. Mevcut `locations` canonical çözümleme yapısı ve request tarafındaki rota metriği çizgisi korunarak taşıyıcı tarafında eşdeğer rota verisi sisteme alındı.

## Bu Adımda Ne Değişti
- `CarrierRoute` adında ayrı bir veri modeli eklendi.
- Backend tarafında `carrier-routes` modülü controller, service, repository ve DTO katmanlarıyla kuruldu.
- `LocationsService.resolveCanonicalLocation()` ve rota metriği hesapları carrier route create/update akışına bağlandı.
- Nakliyeci paneline `Rotalarim` menü girişi eklendi.
- Web tarafında listeleme, oluşturma, detay görüntüleme, düzenleme ve silme akışları açıldı.
- `docs/39-carrier-route-definition-plan.md` plan dokümanı, implementasyon raporuna çevrildi.

## Prisma ve Veritabanı Tarafında Yapılanlar
- `apps/api/prisma/schema.prisma` içine `CarrierRoute` modeli eklendi.
- `Kullanici` modeli ile `CarrierRoute.nakliyeciId -> Kullanici.id` ilişkisi kuruldu.
- Veritabanında başlangıç ve varış konum snapshot alanları, normalize şehir/ilçe alanları, koordinatlar, rota metriği alanları, planlanan tarih ve opsiyonel sapma alanı tanımlandı.
- İndeksler `nakliyeciId + silmeTarihi`, `planlananTarih`, `normalizeBaslangicSehir` ve `normalizeVarisSehir` için eklendi.
- `apps/api/prisma/migrations/20260428120000_add_carrier_routes/migration.sql` migration dosyası üretildi ve tablo oluşturma, indeksler ve foreign key bu migration içine yazıldı.
- Migration yerel veritabanına uygulandı.

## Backend Tarafında Eklenen Yapı
- `apps/api/src/modules/carrier-routes/carrier-routes.module.ts` ile yeni modül `AppModule` içine bağlandı.
- `carrier-routes.controller.ts` içinde carrier route CRUD uçları açıldı.
- `carrier-routes.service.ts` içinde create, list, detail, update ve soft delete akışları kuruldu.
- Servis katmanı başlangıç ve varış seçimlerini `LocationsService.resolveCanonicalLocation()` ile canonical veriye çevirdi.
- Aynı servis katmanı başlangıç ve varış koordinatlarından `LocationsService.getRouteMetrics()` ile ana rota mesafe ve süre snapshot'ını üretti.
- Update akışında place değişmediğinde mevcut canonical snapshot korundu, place değiştiğinde canonical alanlar ve rota metriği yeniden hesaplandı.
- `carrier-routes.repository.ts` içinde tüm sorgular owner-scoped ve `silmeTarihi: null` filtreli çalışacak şekilde bağlandı.
- Create, update, list ve detail response katmanları için DTO sınıfları eklendi.

## API Yüzeyi
- `POST /carrier-routes` rota oluşturma için açıldı.
- `GET /carrier-routes/my` giriş yapan nakliyecinin aktif rotalarını listelemek için açıldı.
- `GET /carrier-routes/my/:id` rota detayını almak için açıldı.
- `PUT /carrier-routes/my/:id` rota güncellemek için açıldı.
- `DELETE /carrier-routes/my/:id` soft delete yapmak için açıldı.
- Write payload içinde `baslangicKonum` ve `varisKonum` alanları `provider`, `placeId` ve opsiyonel `sessionToken` ile alındı.
- `planlananTarih` alanı `YYYY-MM-DD` formatında doğrulandı.
- `maksimumSapmaKm` alanı opsiyonel olarak alındı ve numeric validation ile sınırlandı.

## Web Tarafında Açılan Akışlar
- `apps/web/src/components/CarrierVehiclesShell.tsx` içine `Rotalarim` menü girişi eklendi.
- `apps/web/src/app/dashboard/rotalarim/page.tsx` ile rota listesi açıldı.
- `apps/web/src/app/dashboard/rotalarim/yeni/page.tsx` ile yeni rota oluşturma sayfası açıldı.
- `apps/web/src/app/dashboard/rotalarim/[id]/page.tsx` ile rota detay sayfası açıldı.
- `apps/web/src/app/dashboard/rotalarim/[id]/duzenle/page.tsx` ile rota düzenleme sayfası açıldı.
- Form akışlarında mevcut `LocationAutocompleteField` yeniden kullanıldı.
- Web API katmanında `apps/web/src/lib/api/carrier-routes.ts` dosyası eklendi ve create, list, detail, update, delete çağrıları bu katmanda toplandı.
- Liste ve detay ekranlarında rota mesafesi, rota süresi, planlanan tarih ve varsa maksimum sapma bilgisi gösterildi.

## Rota Verisinde Tutulan Alanlar
- Kimlik ve sahiplik alanları: `id`, `nakliyeciId`
- Başlangıç ve varış şehir alanları: `baslangicSehri`, `varisSehri`
- İnsan okunur konum alanları: `baslangicKonumMetni`, `varisKonumMetni`
- Provider ve place alanları: `baslangicProvider`, `varisProvider`, `baslangicPlaceId`, `varisPlaceId`
- Normalize alanlar: `normalizeBaslangicSehir`, `normalizeVarisSehir`, `normalizeBaslangicIlce`, `normalizeVarisIlce`
- Koordinat alanları: `baslangicEnlem`, `baslangicBoylam`, `varisEnlem`, `varisBoylam`
- Rota metriği alanları: `rotaMesafeMetre`, `rotaSureSaniye`
- Operasyon alanları: `planlananTarih`, `maksimumSapmaKm`
- Yaşam döngüsü alanları: `olusturmaTarihi`, `guncellemeTarihi`, `silmeTarihi`

## Role ve Ownership Kuralları
- Controller seviyesinde `JwtAuthGuard`, `RolesGuard` ve `@Roles(ROLE_NAMES.NAKLIYECI)` bağlandı.
- Servis katmanında da kullanıcı rolleri tekrar doğrulandı ve nakliyeci olmayan çağrılar reddedildi.
- Repository sorguları `nakliyeciId` üzerinden owner-scoped çalıştı.
- Başka bir nakliyecinin rotası listelenmedi, detayda gösterilmedi, güncellenmedi ve silinmedi.
- Silinen kayıtlar soft delete ile `silmeTarihi` doldurularak işaretlendi ve aktif listelerden çıkarıldı.

## Discovery ile Mevcut İlişki
Bu fazda `open-requests` discovery query contract'ı değiştirilmedi. Şehir, kapasite ve mevcut discovery filtreleri korunarak sadece taşıyıcı tarafında kalıcı rota verisi toplandı ve görüntülendi. Route-aware uygunluk, ekstra km, ekstra süre, ranking ve `carrierRouteId` bazlı discovery bağlama bu fazda henüz devreye alınmadı.

## Test / Kontrol Sonuçları
- `npm run prisma:generate` çalıştırıldı ve başarıyla tamamlandı.
- `npx prisma migrate deploy --schema ./prisma/schema.prisma` çalıştırıldı ve `20260428120000_add_carrier_routes` migration'ı başarıyla uygulandı.
- `npm run build:api` başarıyla geçti.
- `npm run build:web` başarıyla geçti.
- `npm run lint:api` başarıyla geçti.
- `npm run lint:web` başarıyla geçti.

## Bilinçli Olarak Yapılmayanlar
- Route-aware matching motoru açılmadı.
- Extra km ve extra süre hesabı discovery tarafına bağlanmadı.
- Otomatik uygunluk skoru ve ranking eklenmedi.
- Otomatik teklif fiyatlama açılmadı.
- Çoklu durak, dönüş rotası ve recurrence eklenmedi.
- Harita üstünde canlı rota görselleştirmesi açılmadı.
- Mesajlaşma ve pazarlık akışı bu faza bağlanmadı.
- Rota modeli `Vehicle` içine gömülmedi ve `aracId` ilişkisi açılmadı.

## Sonraki Mantıklı Adım
Bu fazda kalıcı `CarrierRoute` verisi, canonical konum snapshot'ı ve ana rota metriği hazır hale geldi. Bir sonraki mantıklı adım, açık istekler ekranında seçili `carrierRouteId` bağlamı ile request pickup/dropoff verisini `RouteEngine` üstünden karşılaştırıp ekstra km, ekstra süre ve basit uygunluk etiketini hesaplayan route-aware discovery MVP'sini açmak.

**Terminal Özeti**
- Güncellenen doküman: `docs/39-carrier-route-definition-plan.md`
- Eklenen ana yüzeyler: `CarrierRoute` Prisma modeli, `carrier-routes` backend modülü, `Rotalarim` menü girişi, rota liste/yeni/detay/düzenle web akışları
- Discovery tarafında bu fazda henüz bağlanmayan kısım: `carrierRouteId` bazlı route-aware uygunluk, ekstra km, ekstra süre ve ranking hesapları
