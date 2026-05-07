# Amac

Bu adimin amaci, musteri ile nakliyeci arasinda belirli bir teklif baglaminda izole mesajlasma ve fiyat pazarligi acmakti. Yeni katman mevcut offer / acceptance / notification akislarini bozmadan teklif ustunde konusma ve counter offer davranisi ekledi.

Bu fazda agir bir chat platformu kurulmedi. Odak yalnizca su dort parcada kaldi:

- offer bazli tekil thread
- text mesaj
- counter offer ile fiyat revizyonu
- read/unread ve bildirim entegrasyonu

# Bu Adimda Ne Degisti

- Her `Teklif` icin tek bir `OfferThread` acildi.
- Ayni request altindaki farkli nakliyecilerin teklifleri icin ayri thread'ler olustu; konusmalar birbirine karismadi.
- Taraflar `TEXT` mesaj gonderebilir hale geldi.
- Taraflar `COUNTER_OFFER` tipli mesaj ile yeni fiyat yazabilir hale geldi.
- Her yeni counter offer geldikce `Teklif.fiyat` son gecerli pazarlik fiyati olarak guncellenir oldu.
- Orijinal ilk teklif fiyati kaybolmadi; thread'in ilk `OFFER_CREATED` system event mesajinda fiyat snapshot'i olarak saklandi.
- Bir teklif kabul edilince kazanan thread `OFFER_ACCEPTED` event'i ile kapandi.
- Ayni request altindaki diger aktif offer thread'leri `THREAD_CLOSED_REQUEST_UNAVAILABLE` event'i ile read-only kapandi.
- Yeni mesaj ve karsi teklif icin notification entegrasyonu acildi.
- `Nakliyeci > Acik Istekler` ekraninda harita masaustunde de ust tarafa alindi; sag sticky kolon gorunumu kaldirildi.

# Domain Modeli

Bu fazda iki yeni tablo acildi:

- `OfferThread`
- `OfferThreadMessage`

`OfferThread` su baglamlari tasir:

- `offerId`
- `requestId`
- `customerId`
- `carrierId`
- `customerLastReadMessageId`
- `carrierLastReadMessageId`
- `closedAt`

Kritik kural:

- `offerId` unique tutuldu

Boylece ayni offer icin ikinci thread acilamaz hale geldi.

`OfferThreadMessage` ise stream kaydidir. Her mesaj su tiplerden biri olur:

- `TEXT`
- `COUNTER_OFFER`
- `SYSTEM_EVENT`

Ayri `ConversationParticipant` veya `CounterOffer` tablosu acilmadi. Bu MVP icin iki participant sabit oldugu ve counter offer tipli mesaj olarak modellenebildigi icin ek tablo acmak gereksizdi.

# Threadlerin Karismamasi ve Kapanma Kurallari

Bu fazdaki ana urun karari thread'i request'e degil offer'a baglamak oldu. Sebep nettir: ayni request'e birden fazla nakliyeci teklif verebilir.

Kurallar:

- her offer'in kendi thread'i vardir
- baska nakliyeci rakip offer'in thread'ini goremez
- musteri ayni request'teki farkli offer thread'lerini ayri ayri gorur
- offer `KABUL_EDILDI` veya `REDDEDILDI` oldugunda ilgili thread read-only olur
- bir offer kabul edilince ayni request altindaki diger aktif offer thread'leri de read-only kapanir

Bu son kural icin thread stream'ine su system event yazilir:

- `THREAD_CLOSED_REQUEST_UNAVAILABLE`

Boylece kaybeden pazarlik thread'leri sessizce kapanmak yerine neden kapandiklarini acikca gosterir.

# Counter Offer ve Fiyat Audit Izi

Counter offer ayrica ayri bir state makinesi olarak kurulmedi. Bunun yerine her counter offer bir `OfferThreadMessage` kaydi olarak saklandi.

Davranis:

- kullanici yeni fiyat yazar
- `COUNTER_OFFER` mesaji olusur
- ayni transaction icinde `Teklif.fiyat` bu yeni fiyatla guncellenir

Bu fazda kritik olarak su korundu:

- ilk teklif fiyati kaybolmaz
- `OFFER_CREATED` system event mesaji ilk fiyat snapshot'ini tasir
- sonraki her `COUNTER_OFFER` yeni fiyat adimini stream'e ekler

Boylece `Teklif.fiyat` mevcut ozet fiyat olurken, tam pazarlik gecmisi message stream icinde audit izi olarak korunur.

# Read / Unread Mantigi

Read/unread mantigi participant bazli last-read pointer modeliyle kuruldu.

Kullanilan alanlar:

- `customerLastReadMessageId`
- `carrierLastReadMessageId`

Davranis:

- thread detay acildiginda kullanici son mesaja kadar okumus sayilir
- kullanici mesaj gonderdiginde kendi pointer'i otomatik ileri cekilir
- thread listesi unread badge ve unread count'u bu pointer'lara gore hesaplar

Ayri bir message-read-state tablosu acilmadi. Iki participant sabit oldugu icin bu model daha sade ve yeterli oldu.

# Bildirim Entegrasyonu

Mevcut notifications akisi korunarak iki yeni bildirim tipi eklendi:

- `MESAJ_GELDI`
- `KARSI_TEKLIF_GELDI`

Kurallar:

- `TEXT` mesaj yalnizca diger katilimciya bildirim uretir
- `COUNTER_OFFER` yalnizca diger katilimciya bildirim uretir
- `SYSTEM_EVENT` mesajlari ayri bir message notification uretmez
- mevcut `TEKLIF_GELDI`, `TEKLIF_KABUL_EDILDI`, `TEKLIF_REDDEDILDI` bildirimi korunur

Bildirim linkleri thread detayina yonlenir:

- `/dashboard/konusmalar/teklif/:offerId`

# Backend Tarafinda Yapilanlar

Bu fazda yeni modul acildi:

- `apps/api/src/modules/offer-threads`

Bu modul icinde:

- controller
- service
- repository
- thread list/detail/message DTO'lari

Ana backend entegrasyonlari:

- offer create aninda thread bootstrap edilir
- ilk `OFFER_CREATED` system event ayni transaction icinde yazilir
- counter offer olustugunda hem message stream yazilir hem `Teklif.fiyat` guncellenir
- offer kabulunde kazanan thread kapanir
- ayni request altindaki diger aktif thread'ler bulunur ve `THREAD_CLOSED_REQUEST_UNAVAILABLE` event'i ile kapanir
- offer reddinde ilgili thread `OFFER_REJECTED` event'i ile kapanir

Yeni endpointler:

- `GET /offer-threads/my`
- `GET /offer-threads/offers/:offerId`
- `POST /offer-threads/offers/:offerId/messages`
- `POST /offer-threads/offers/:offerId/counter-offers`
- `POST /offer-threads/offers/:offerId/read`

Mevcut nihai karar endpointleri korunmustur:

- `POST /offers/:offerId/accept`
- `POST /offers/:offerId/reject`

# Web Tarafinda Acilan Yuzeyler

Yeni ortak dashboard yuzeyleri:

- `apps/web/src/app/dashboard/konusmalar/page.tsx`
- `apps/web/src/app/dashboard/konusmalar/teklif/[offerId]/page.tsx`

Her iki rolde de yeni nav girisi acildi:

- `Konusmalar`

Thread listesinde kullanici su ozetleri gorur:

- teklif id
- istek id / rota ozeti
- karsi taraf bilgisi
- mevcut fiyat
- offer durumu
- son mesaj ozeti
- son aktivite zamani
- unread badge

Thread detayinda:

- text mesajlar
- counter offer satirlari
- system event satirlari
- normal mesaj composer
- karsi teklif composer
- uygun durumda accept / reject aksiyonlari

Thread kapanmissa composer read-only olur.

# Acik Istekler Harita Yerlesimi Duzeltmesi

Bu implementasyon turunda ek olarak `Nakliyeci > Acik Istekler` sayfasindaki harita yerlesimi sadeleştirildi.

Eski davranis:

- masaustunde istekler solda
- harita sagda sticky kolon

Yeni davranis:

- harita masaustunde de ustte tam genislikte durur
- istek listesi haritanin altina akar
- mobil ve desktop map-first duzeni hizalanir

Bu degisiklik messaging domaininden bagimsiz bir UX duzeltmesi olarak ayni turda tamamlandi.

# Bilincli Olarak Yapilmayanlar

Bu fazda bilincli olarak eklenmeyenler:

- websocket zorunlulugu
- typing indicator
- dosya / foto / attachment gonderme
- grup konusmasi
- request geneline acik chat
- ayri counter-offer state machine
- moderasyon paneli
- sesli / goruntulu iletisim
- harita ustunden chat
- CRM seviyesi message center

# Dogrulama

Bu faz sonunda su komutlar basariyla calisti:

- `npm run prisma:generate` (`apps/api`)
- `npm run build` (`apps/api`)
- `npm run lint` (`apps/api`)
- `npm run build` (`apps/web`)
- `npm run lint` (`apps/web`)

Bu turda migration SQL dosyasi eklendi ve Prisma schema guncellendi. Uygulama seviyesinde ek e2e test yazilmadi.

# Kisa Sonuc

Bu adimla proje, teklif verildikten sonraki en kritik boslugu kapatti: artik musteri ve nakliyeci belirli bir teklif baglaminda thread icinde konusabiliyor, fiyat revize edebiliyor, read/unread rozetleri gorebiliyor ve bildirimlerle dogru thread'e donebiliyor. Ayni zamanda thread karismasi riski offer bazli unique model ile kapatildi, kabul edilen request altindaki diger pazarliklar da acik sistem eventi ile kapatildi.
