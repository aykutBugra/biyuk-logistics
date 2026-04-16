# Amaç

Bu adımın amacı, mevcut `transport-requests` frontend müşteri akışını gerçekten çalışır hale getirmek ve auth store kaynaklı sonsuz render hatasını doğru biçimde düzeltmekti. Ek olarak müşteri için `Istek Ekle / Isteklerim` girişleri üst navbar yerine dashboard içinde soldaki ortak menüye taşındı.

# Tespit Edilen Sorunlar

- `useSyncExternalStore` kullanan auth helper içinde snapshot sonucu stabil değildi.
- `getStoredAuth()` her çağrıda yeniden parse edilmiş yeni obje döndürdüğü için React sonsuz döngü uyarısı veriyordu.
- `Istek Ekle / Isteklerim` girişleri hem ana sayfada hem navbar’da görünür olduğu için dashboard içi navigasyon dağınık görünüyordu.
- Üç müşteri sayfasında ortak bir sol navigasyon iskeleti yoktu.

# Infinite Loop Hatasının Nedeni

Hatanın ana nedeni `auth-storage` içindeki `getStoredAuth()` fonksiyonunun `localStorage` değerini her çağrıda `JSON.parse(...)` ile yeniden objeye çevirmesiydi. `useSyncExternalStore`, aynı store durumu değişmediyse aynı snapshot referansını bekler. Her render’da yeni obje üretildiğinde React bunu yeni snapshot gibi gördü ve `The result of getSnapshot should be cached to avoid an infinite loop` hatasını üretti.

# Yapılan Düzeltmeler

- `auth-storage.ts` içinde snapshot cache mantığı eklendi.
- Cache, `localStorage` raw string değeri ile son parse edilen auth objesini birlikte tutacak şekilde kuruldu.
- Storage içeriği değişmedikçe `getStoredAuth()` aynı referansı döndürmeye başladı.
- `setStoredAuth()` ve `clearStoredAuth()` cache’i de güncelleyecek şekilde hizalandı.
- Custom auth event ve `storage` event mantığı korunarak aynı tab auth güncellemesi bozulmadı.
- Dashboard için ortak sol menü ve üst içerik iskeleti oluşturan `CustomerTransportRequestsShell` bileşeni eklendi.
- `/dashboard/istek_ekle`, `/dashboard/isteklerim` ve `/dashboard/isteklerim/[id]` bu ortak shell içine alındı.
- `Navbar` içindeki müşteri özel `Istek Ekle / Isteklerim` linkleri kaldırıldı.
- Ana sayfadaki ortadaki müşteri CTA butonları korundu.

# Düzeltilen Sayfalar

- `/dashboard/istek_ekle`
- `/dashboard/isteklerim`
- `/dashboard/isteklerim/[id]`

Bu sayfalarda:

- ortak auth kontrolü çalışmaya devam ediyor
- loading gate stabil kaldı
- `401 -> /login`
- `403 -> /`
- detay sayfasında `404 -> Bu istek bulunamadi.` davranışı korundu
- sayfa içi navigasyon soldaki ortak menüye taşındı

# Navbar ve Ana Sayfa Davranışı

- Auth olmayan kullanıcı için `Giris Yap / Kayit Ol` davranışı korunmuştur.
- Auth olmuş kullanıcı için logout davranışı korunmuştur.
- Müşteri kullanıcı ana sayfada ortadaki `Yeni Istek Ekle / Isteklerimi Gor` CTA’larını görmeye devam eder.
- Üst navbar artık müşteri özel `Istek Ekle / Isteklerim` linklerini göstermez.
- Bu iki giriş yalnızca transport-requests dashboard alanında soldaki menüde görünür.

# Iletisim Sayfası Düzeltmesi

Bu adımda son kullanıcı isteğine göre `iletisim` sayfası kapsam dışı bırakıldı ve değiştirilmedi. Bu nedenle `build:web` sonucu değerlendirilirken `apps/web/src/app/iletisim/page.tsx` kaynaklı hata varsa “unrelated / kapsam dışı” olarak raporlanmalıdır.

# Test / Kontrol Sonuçları

- `npm run lint:web`
- `npm run build:web`

Beklenen kontrol listesi:

- müşteri login sonrası ana sayfada CTA’ları görür
- navbar’da üstte `Istek Ekle / Isteklerim` görünmez
- üç dashboard sayfasında soldaki ortak menü görünür
- auth store kaynaklı infinite loop kalkar
- create/list/detail akışı render olur
- logout davranışı bozulmaz

Not: `build:web` sonucu kapsam dışı `iletisim` sayfasına bağlı olarak ayrıca raporlanmalıdır.

# Kalan Bilinçli Sınırlar

- `iletisim` ve `hakkimizda` sayfaları bu adımda değiştirilmedi
- transport-request update/cancel/delete yok
- harita/autocomplete yok
- vehicles / offers / jobs / ratings / notifications yok
- global dashboard redesign yok
- SSR auth / cookie auth / middleware auth yok

# Sonraki Mantıklı Adım

Bu stabilizasyon tamamlandıktan sonra sonraki mantıklı adım, müşteri akışının gerçek veriyle uçtan uca manuel doğrulanması ve ardından istenirse nakliyeci tarafı için ayrı görünür giriş noktalarının planlanmasıdır. Domain kapsamını büyütmeden önce mevcut müşteri akışının API ve UI seviyesinde tutarlı çalıştığı doğrulanmalıdır.
