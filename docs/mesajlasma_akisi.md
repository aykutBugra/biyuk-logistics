Mesajlaşma + Karşı Teklif Akış Şeması

Kısa Özet
Bu sistemde konuşma bağlamı request değil offer.

Yani:

her teklifin kendi thread’i var
aynı request’e iki farklı nakliyeci teklif verirse iki ayrı thread oluşuyor
konuşmalar karışmıyor
Ayrıca bu sistem şu an anlık websocket chat değil.

Çalışma modeli:

sayfa açılınca fetch
mesaj gönderince POST
sonra ekran tekrar fetch
yeni mesaj/karşı teklif için bildirim üretimi
1. Teklif oluşturulunca thread nasıl açılıyor?
Ana giriş noktası:

offers.service.ts
İlgili akış:

OffersService.create(...)
önce normal teklif kaydı oluşturuluyor
sonra aynı transaction içinde:
offerThreadsService.bootstrapThreadForOffer(...)
Bu çağrı şuraya gidiyor:

offer-threads.service.ts
bootstrapThreadForOffer(...)
Oradan da repository’ye gidiyor:

offer-threads.repository.ts
createThreadWithInitialOfferEvent(...)
Burada olan şey:

OfferThread oluşturulur
ilk mesaj olarak SYSTEM_EVENT / OFFER_CREATED yazılır
bu ilk event içinde teklifFiyati saklanır
Bu çok önemli:

Teklif.fiyat sonra değişebilir
ama ilk fiyat thread geçmişinde kaybolmaz
audit izi OFFER_CREATED event’inde korunur
2. Thread neden offer’a bağlı?
Bunu sağlayan temel kural:

OfferThread.offerId unique
Yani:

bir offer için sadece bir thread var
ikinci kez aynı offer için yeni thread açılamaz
Bu yüzden:

request bazlı karışma olmuyor
taşıyıcı A ile müşteri konuşması ayrı
taşıyıcı B ile müşteri konuşması ayrı
Ana kod:

offer-threads.repository.ts
3. Konuşma listesi nasıl çalışıyor?
Backend endpoint:

GET /offer-threads/my
Controller:

offer-threads.controller.ts
getMine(...)
Service:

offer-threads.service.ts
getMine(...)
Repository:

offer-threads.repository.ts
findMyThreadSummaries(...)
Frontend çağrısı:

offer-threads.ts
getMyOfferThreads(...)
Liste ekranı:

konusmalar/page.tsx
Mantık:

sayfa açılınca useEffect çalışıyor
thread listesi API’den çekiliyor
websocket yok
canlı push yok
yenileme fetch ile oluyor
4. Thread detayı nasıl çalışıyor?
Backend endpoint:

GET /offer-threads/offers/:offerId
Controller:

offer-threads.controller.ts
getByOfferId(...)
Service:

offer-threads.service.ts
getByOfferId(...)
Repository:

offer-threads.repository.ts
findThreadDetailByOfferIdForUser(...)
Frontend ekran:

teklif/[offerId]/page.tsx
Bu ekranda:

tüm message stream çekiliyor
TEXT
COUNTER_OFFER
SYSTEM_EVENT
hepsi aynı akışta gösteriliyor

5. Normal mesaj nasıl gidiyor?
Endpoint:

POST /offer-threads/offers/:offerId/messages
Controller:

offer-threads.controller.ts
createTextMessage(...)
Service:

offer-threads.service.ts
createTextMessage(...)
Önce:

requireWritableContext(...)
yani thread gerçekten bu kullanıcıya ait mi
thread yazmaya açık mı
Sonra repository:

offer-threads.repository.ts
createTextMessage(...)
Burada:

TEXT mesajı yazılır
gönderenin lastRead pointer’ı yeni mesaja çekilir
Sonra bildirim:

notifications.publisher.ts
publishThreadMessage(...)
Frontend tarafında:

mesaj gönder
başarılıysa reloadKey artıyor
ekran thread’i tekrar fetch ediyor
Yani yine:

canlı socket yok
POST + refetch var
6. Karşı teklif nasıl çalışıyor?
Endpoint:

POST /offer-threads/offers/:offerId/counter-offers
Controller:

offer-threads.controller.ts
createCounterOffer(...)
Service:

offer-threads.service.ts
createCounterOffer(...)
Repository:

offer-threads.repository.ts
createCounterOfferMessage(...)
Buradaki kritik mantık:

önce teklif.fiyat update edilir
sonra thread’e COUNTER_OFFER mesajı yazılır
mesaj içine de teklifFiyati yazılır
gönderenin read pointer’ı güncellenir
Yani sistem şunu yapıyor:

Teklif.fiyat = güncel fiyat özeti
OfferThreadMessage = tam pazarlık geçmişi
Bu yüzden:

son fiyat üst kartta görünür
fiyat geçmişi akışta kaybolmaz
Bildirim:

notifications.publisher.ts
publishCounterOffer(...)
Frontend:

teklif/[offerId]/page.tsx
handleSendCounterOffer(...)
Akış:

form submit
POST
sonra thread tekrar fetch
7. Okundu / okunmadı nasıl çalışıyor?
Bu sistem message-by-message receipt tutmuyor.

Kullandığı model:

participant bazlı son okunan mesaj pointer’ı
Alanlar:

customerLastReadMessageId
carrierLastReadMessageId
Repository:

offer-threads.repository.ts
markThreadAsRead(...)
countUnreadMessages(...)
Service:

offer-threads.service.ts
markRead(...)
Frontend:

thread detayı açılıyor
eğer hasUnread=true ise
markOfferThreadAsRead(...) çağrılıyor
Kod:

offer-threads.ts
markOfferThreadAsRead(...)
Yani mantık:

thread açıldı
son mesaja kadar okundu say
unread count sıfırla
8. Teklif kabul / red olunca ne oluyor?
Kabul
Ana kod:

offers.service.ts
acceptById(...)
Burada:

offer kabul transaction’ı çalışıyor
shipment oluşuyor
kazanan thread için:
offerThreadsService.closeAcceptedOfferThread(...)
aynı request altındaki diğer aktif offer’lar bulunursa:
offerThreadsService.closeRequestUnavailableThreads(...)
Bu çok kritik:

kazanan thread OFFER_ACCEPTED
diğerleri THREAD_CLOSED_REQUEST_UNAVAILABLE
Yani müşteri bir teklifi kabul edince:

sadece bir thread değil
aynı request’in diğer aktif pazarlıkları da kapanıyor
Red
Kod:

offers.service.ts
rejectById(...)
Burada:

closeRejectedOfferThread(...)
thread içine OFFER_REJECTED event’i yazılır
thread kapanır
9. Bildirimler mesajlaşmada ne iş görüyor?
Mesajlaşma anlık socket olmadığı için bildirim çok önemli.

Kod:

notifications.publisher.ts
İlgili tipler:

MESAJ_GELDI
KARSI_TEKLIF_GELDI
ayrıca mevcut:
TEKLIF_GELDI
TEKLIF_KABUL_EDILDI
TEKLIF_REDDEDILDI
Mesajlaşma için roller:

kullanıcı ekrana bakmıyorken olaydan haberdar olur
bildirime tıklayınca thread detail’e gider
sonra ekran fetch ile güncel akışı çeker
Yani bildirim:

push yerine değil
push eksikliğini kısmen telafi eden asenkron uyarı mekanizması
10. “Anlık mı?” sorusunun en net cevabı
Hayır, şu an tam anlık değil.

Şu anki model:

websocket yok
SSE yok
typing indicator yok
otomatik canlı stream update yok
Şu var:

thread listesi fetch ile yüklenir
thread detayı fetch ile yüklenir
mesaj yazınca POST atılır
sonra ekran yeniden fetch edilir
yeni olaylar için bildirim gelir
Kısacası:

notification-driven + fetch-based conversation
tam real-time chat değil
11. Tam akış tek satırda
nakliyeci teklif verir
offer oluşur
aynı transaction’da thread açılır
ilk OFFER_CREATED system event yazılır
müşteri / nakliyeci thread’i açar
thread detayını fetch eder
thread açıldıysa mark-read çalışır
taraflardan biri TEXT mesaj gönderir veya COUNTER_OFFER yazar
karşı tarafa bildirim gider
ekran refetch ile güncellenir
müşteri kabul veya red verirse system event yazılır
kabul varsa diğer sibling thread’ler de kapanır