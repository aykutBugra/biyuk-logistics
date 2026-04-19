# Notifications First Flow

## Amaç

Bu adımda sistemde zaten oluşan teklif, nakliye ve rating olaylarını kullanıcıya görünür hale getiren ilk resmi in-app notification katmanı açıldı. Amaç yeni bir ana domain kurmak değil; mevcut çalışan domain akışlarını kullanıcının kaçırmayacağı bir merkeze taşımaktı.

İlk faz sonunda:
- kullanıcı kendi bildirim listesini görebiliyor
- okunmamis sayac navbar ve dashboard içinde görünür hale geldi
- tekli `okundu` ve toplu `tumunu okundu say` akışı çalışıyor
- mevcut `offers`, `jobs` ve `ratings` servisleri kontrollü bir publisher üzerinden notification üretiyor

## Neden Sıradaki Modül Notifications

Bu faz ratings sonrası doğru sıradaydı. Çünkü sistem artık yalnızca veri üretmiyor; kullanıcıyı geri çağırması gereken olaylar da üretiyor:
- yeni teklif
- teklif kabul / red
- is basladi
- is tamamlandi
- rating verildi
- rating verme beklentisi

Notifications bu olayları görünür hale getirerek mevcut feature setinin kullanılabilirliğini artırdı. Yeni bir soyut modül açmak yerine var olan akışların ürün yüzeyini güçlendirdi.

## Neden Messaging Henüz Başlamıyor

Messaging hâlâ ayrı ve daha büyük bir domain. Bu adımda ona girilmedi çünkü:
- thread modeli yok
- request / offer / job bağlamlı konuşma ilişkisi yok
- mesaj seviyesi unread / read mantığı yok
- moderation ve abuse çizgisi yok
- real-time katman yok

Notifications bu ihtiyaçların hiçbirini açmadan değer üretebildiği için önce o tamamlandı.

## Neden Real-Time Push Henüz Başlamıyor

İlk faz bilinçli olarak HTTP tabanlı ve pull modelinde bırakıldı. Çünkü bugünkü ihtiyaç:
- anlık socket senkronu değil
- kaçırılmayan olay görünürlüğü

Bu yüzden:
- websocket yok
- web push yok
- email yok
- sms yok

Önce kalıcı notification merkezi ve read/unread mantığı kuruldu. Gerçek zamanlı katman daha sonra bunun üstüne oturabilir.

## İlk Fazın Ürün Kararları

Uygulanan kararlar:
- ilk kanal yalnızca in-app notification
- bildirimler current user hesabına ait
- her bildirim `tip`, `baslik`, `mesaj`, `hedefUrl` ve `okunmaTarihi` taşır
- unread/read mantığı `okunmaTarihi` üstünden çalışır
- navbar unread badge vardır
- dashboard shell içinde `Bildirimler` girişi vardır
- `Tumunu okundu say` ilk faza dahil edilmiştir
- bildirim üretimi best-effort publisher katmanında toplanmıştır

Bilinçli bir ürün kararı olarak ayrı `IS_OLUSTURULDU` notification açılmadı. Taşıyıcı için `TEKLIF_KABUL_EDILDI` bildirimi zaten bu anlamı kapsıyor.

## Veritabanı ve Domain Eşleşmesi

Yeni Prisma modeli:
- `Bildirim`

Eklenen alanlar:
- `id`
- `kullaniciId`
- `tip`
- `baslik`
- `mesaj`
- `hedefUrl`
- `olayAnahtari`
- `okunmaTarihi`
- `olusturmaTarihi`

Ek kararlar:
- `Bildirim` -> `Kullanici` ilişkisi eklendi
- `olayAnahtari` üstünde unique index var
- `kullaniciId + okunmaTarihi + olusturmaTarihi` üstünde index var
- soft delete yok

Migration:
- `apps/api/prisma/migrations/20260419153834_add_notifications_first_flow/migration.sql`

## Hangi Olaylar Notification Üretmeli

İlk fazda açılan eventler:

1. `TEKLIF_GELDI`
- üretildiğinde: taşıyıcı teklif oluşturduğunda
- hedef kullanıcı: müşteri
- hedef ekran: `/dashboard/isteklerim/:requestId`

2. `TEKLIF_KABUL_EDILDI`
- üretildiğinde: müşteri teklifi kabul ettiğinde
- hedef kullanıcı: ilgili nakliyeci
- hedef ekran: `/dashboard/nakliyelerim/:jobId`

3. `TEKLIF_REDDEDILDI`
- üretildiğinde: müşteri teklifi manuel reddettiğinde
- hedef kullanıcı: ilgili nakliyeci
- hedef ekran: `/dashboard/tekliflerim`

4. `IS_BASLADI`
- üretildiğinde: taşıyıcı işi başlattığında
- hedef kullanıcı: müşteri
- hedef ekran: `/dashboard/isteklerim/:requestId`

5. `IS_TAMAMLANDI`
- üretildiğinde: taşıyıcı işi tamamladığında
- hedef kullanıcı: müşteri
- hedef ekran: `/dashboard/isteklerim/:requestId`

6. `RATING_ALDIN`
- üretildiğinde: karşı taraf rating oluşturduğunda
- hedef kullanıcı: puanlanan kullanıcı
- hedef ekran: `/dashboard/puanlarim`

7. `RATING_BEKLIYOR`
- üretildiğinde: iş tamamlandığında
- hedef kullanıcı: taşıyıcı
- hedef ekran: `/dashboard/nakliyelerim/:jobId`

İlk fazda açılmayan olaylar:
- ilk araç kaydı oluşturuldu
- hoş geldin / onboarding
- profil puanı güncellendi
- request oluşturuldu
- araç oluşturuldu

## İlk Fazın Kapsamı

Bu fazda gerçekten açılan yüzey:
- notification kayıt modeli
- notification listesi
- unread count endpoint’i
- tekil read
- bulk read-all
- navbar badge
- shell menüsüne `Bildirimler`
- yeni `/dashboard/bildirimler` ekranı
- mevcut domain servislerinden controlled notification publish

Kapsam dışı bırakılanlar:
- websocket
- email
- sms
- messaging
- conversation/thread modeli
- notification preference sistemi
- arama / filtre / sayfalama

## Önerilen Backend Yapısı

Açılan backend yapısı:
- `notifications.module.ts`
- `notifications.controller.ts`
- `notifications.service.ts`
- `notifications.publisher.ts`
- `repositories/notifications.repository.ts`
- `dto/*`

Ek modül bağlantıları:
- `NotificationsModule` artık `AppModule` içinde
- `OffersModule`, `JobsModule`, `RatingsModule` içine import edildi

Publisher tasarımı:
- tam event bus yok
- outbox yok
- domain servislerin içine dağılmış raw insert yok
- bunun yerine senkron ve küçük bir `NotificationsPublisher` var

Bu publisher:
- explicit publish method’ları sunuyor
- duplicate event’i `olayAnahtari` ile yutuyor
- hata alsa bile ana domain aksiyonunu rollback etmiyor

## Önerilen Endpointler

Uygulanan HTTP yüzeyi:
- `GET /api/v1/notifications/my`
- `GET /api/v1/notifications/my/unread-count`
- `POST /api/v1/notifications/:notificationId/read`
- `POST /api/v1/notifications/my/read-all`

Davranış:
- liste en yeni 50 kaydı döner
- unread kayıtlar öne alınır
- `read` idempotent davranır
- `read-all` yalnızca current user kayıtlarını etkiler

## DTO / Validation Yaklaşımı

Eklenen response DTO’lar:
- `NotificationListItemResponseDto`
- `UnreadNotificationCountResponseDto`
- `MarkNotificationAsReadResponseDto`
- `MarkAllNotificationsAsReadResponseDto`

Validation kararları:
- notification id route param ile integer çözülür
- kullanıcı yalnızca kendi kaydını görebilir
- `tip` ve `hedefUrl` istemciden gelmez; backend üretir

## Rol ve Yetki Kuralları

Temel kurallar:
- kullanıcı yalnızca kendi bildirim listesini görebilir
- kullanıcı yalnızca kendi notification kaydını read yapabilir
- `read-all` yalnızca current user unread kayıtlarını etkiler
- başka kullanıcının notification kaydı repo çizgisinde `404` ile kapanır

Duplicate/idempotency:
- `olayAnahtari` unique olduğu için aynı event ikinci kez yazılamaz
- özellikle korunan anahtarlar:
  - `TEKLIF_GELDI:{offerId}`
  - `TEKLIF_KABUL_EDILDI:{offerId}`
  - `TEKLIF_REDDEDILDI:{offerId}`
  - `IS_BASLADI:{jobId}`
  - `IS_TAMAMLANDI:{jobId}`
  - `RATING_ALDIN:{ratingId}`
  - `RATING_BEKLIYOR:{jobId}:{userId}`

## Frontend Tarafında Gerekli Minimum Akış

Web tarafında açılan noktalar:
- navbar içinde `Bildirimler` linki + unread badge
- hem müşteri hem nakliyeci shell’inde `Bildirimler`
- yeni `/dashboard/bildirimler` sayfası

Bildirimler sayfası:
- unread / total özet kartları
- `Tumunu okundu say`
- okunmus / okunmamis kart ayrımı
- `Okundu say` aksiyonu
- `hedefUrl` varsa `Ac` ile ilgili ekrana gitme

Ek UX kararı:
- navbar dropdown açılmadı
- ayrı mini popover yapılmadı
- sade full-page merkez tercih edildi

## Unread / Read Yaklaşımı

Read modeli:
- `okunmaTarihi = null` => unread
- `okunmaTarihi != null` => read

Akış:
- kullanıcı tekli `okundu` yapabilir
- kullanıcı `tumunu okundu say` yapabilir
- hedef ekrana açmadan önce notification read edilir

Navbar badge güncelleme mantığı:
- login sonrası fetch
- route değişiminde fetch
- local notification change event’i ile fetch
- polling yok
- websocket yok

## Bilinçli Olarak Sonraya Bırakılanlar

- websocket
- gerçek zamanlı push
- web push
- email
- sms
- notification preference sistemi
- kategori / kanal abonelikleri
- sessize alma
- messaging
- karşı teklif sohbeti
- public activity feed
- admin notification paneli
- pagination / search / filters
- grouping / smart merge
- notification silme / arşivleme
- soft delete
- PrimeReact veya büyük UI redesign

## Alternatif Başlangıç Yolları ve Neden Seçilmedi

Önce messaging:
- thread ve moderation modeli yoktu
- notification’a göre çok daha büyük scope açıyordu

Önce real-time push:
- core fayda için şart değildi
- connection/state senkron maliyeti getiriyordu

Önce email/sms:
- kanal yönetimi ve preference sistemi gerektiriyordu
- in-app center olmadan ters sıraydı

Önce preference sistemi:
- önce hangi eventlerin gerçekten değer ürettiğini görmek daha doğruydu

## Uygulama Sırası Önerisi

Bu adımda uygulanan sıra:

1. `Bildirim` modeli ve migration
2. notifications module + repository + service + controller
3. `NotificationsPublisher`
4. `offers`, `jobs`, `ratings` servislerine publish hook’ları
5. unread-count ve read endpoint’leri
6. web API helper’ları
7. navbar badge + shell linkleri
8. `/dashboard/bildirimler`
9. build/lint doğrulaması

## Toplantıda Kullanılacak Kısa Savunma Metni

Sıradaki doğru adım messaging değil notifications’tı. Çünkü sistem artık teklif, nakliye lifecycle ve rating tarafında gerçekten kullanıcıya gösterilmesi gereken olaylar üretiyor. Bu adımda önce sade ama gerçek fayda üreten in-app notification merkezi açtık. Kullanıcı artık kendi olay akışını görebiliyor, okunmamis sayacı takip edebiliyor ve ilgili ekrana tek tıkla dönebiliyor. Websocket, email ve preference sistemi gibi katmanları bilinçli olarak sonraya bıraktık; çünkü önce kalıcı notification modeli ve read/unread mantığının oturması gerekiyordu.
