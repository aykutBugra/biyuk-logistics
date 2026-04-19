# Amaç

Bu adimda tamamlanan `Nakliye` kaydi ustunden iki tarafli ama dar kapsamli rating akisi acildi. Hedef; rating'i bagimsiz ve keyfi bir genel puan mekanizmasi olarak degil, yalnizca tamamlanmis is ustunden uretilen dogrulanabilir bir kapanis verisi olarak sisteme eklemekti.

Bu faz sonunda:

- musteri tamamlanan isinde nakliyeciyi puanlayabilir
- nakliyeci tamamlanan isinde musteriyi puanlayabilir
- ayni nakliyede ayni yon icin ikinci rating acilamaz
- kullanici verdigi ve aldigi puanlari gorebilir
- profil ozeti, bu is bazli kayitlardan turetilen ortalama puan mantigiyla calisir

# Neden Sıradaki Modül Ratings

Sistem artik su zinciri sonuna kadar ilerleyebiliyor:

- request olusturma
- teklif verme
- teklif kabul etme
- `Nakliye` olusturma
- isi baslatma
- isi tamamlama

Bu noktadan sonra dogal sonraki modül ratings oldu. Cunku artik tamamlanmis bir hizmet birimi var ve kalite geri bildirimi yalnizca bu noktada anlamli hale geliyor.

Bu karar urune su degeri ekliyor:

- tamamlanan isler icin guvenilir geri bildirim toplama
- gelecekte profil guveni icin temel veri uretme
- sonraki fazlarda siralama, gorunurluk ve guven sinyali icin somut veri biriktirme

# Neden Notifications Henüz Başlamıyor

Notifications bu fazda yine destekleyici katman olarak sonraya birakildi. Cunku:

- `rating pending`
- `you received a rating`
- `counterparty rated you`

gibi event'ler ancak rating akisi sabitlendikten sonra anlamli olur.

Bu adimda once rating domain'i netlestirildi:

- ne zaman acilacagi
- kimlerin verecegi
- duplicate kurali
- profil ozetine nasil donusecegi

Bu taban oturduktan sonra notification eklemek daha savunulabilir hale geldi.

# Rating Ne Zaman Açılmalı

Bu fazda rating yalnizca `NAKLIYE / TAMAMLANDI` sonrasina acildi.

Acik olarak acilmayan anlar:

- offer acceptance sonrasi
- `NAKLIYE / OLUSTURULDU`
- `NAKLIYE / BASLATILDI`

Backend create kurali buna gore calisiyor:

- shipment okunabilir olacak
- current user shipment taraflarindan biri olacak
- shipment durumu `TAMAMLANDI` olacak
- aksi durumda `409 Conflict` donulecek

Bu karar, erken veya baglamsiz puanlamayi engelliyor.

# Neden Rating Nakliye Bazlı Olmalı

Bu fazda rating ana kayit birimi dogrudan `Nakliye` secildi. Cunku `Nakliye`:

- gerceklesen isi temsil ediyor
- musteri + nakliyeci + arac + fiyat + rota baglamini tek kayitta topluyor
- soyut iliski degil, tamamlanmis operasyon kaydi olarak duruyor

Bu nedenle ayri bir "genel puan ver" akisi acilmadi. Genel profil puani, yalnizca bu is bazli ratinglerden turetiliyor.

# Genel Profil Puanı Nasıl Elde Edilecek

Genel profil puani ayri cache veya ayri tablo olarak tutulmadi. Ilk fazda dogrudan `Puanlama` kayitlarindan aggregation ile turetiliyor.

Secilen ozet modeli:

- `asCarrier`
- `asCustomer`

Her bucket su iki alani tasiyor:

- `averageRating`
- `ratingCount`

Boylece kullanici ayni hesapta iki rol tasiyorsa puanlar tek havuza karismiyor:

- nakliyeci olarak aldigi hizmet puani
- musteri olarak aldigi isbirligi puani

# Veritabanı ve Domain Eşleşmesi

Bu fazda mevcut schema cizgisi korunarak ratings acildi:

- `Nakliye.puanlar`
- `Puanlama`
- `PuanTanimlari`

Eklenen DB guvenceleri:

- `Puanlama` icin `@@unique([nakliyeId, puanlayanId, puanlananId])`
- `nakliyeId`, `puanlayanId`, `puanlananId` index'leri
- `PuanTanimlari` icin `SAYISAL_1_5` seed kaydi

Yeni migration:

- `20260419113000_add_ratings_first_flow_constraints_and_seed`

Bu migration ile:

- aynı is ve ayni yon icin ikinci rating engellendi
- 1-5 sayisal rating semasi DB tarafinda garanti altina alindi

Yorum alani mevcut schema'daki `yorum` alani kullanilarak opsiyonel tutuldu.

# İlk Fazın Kapsamı

Bu adimda acilan resmi kapsam:

- tamamlanan `Nakliye` icin rating create
- current user `verdigim puanlar` listesi
- current user `aldigim puanlar` listesi
- current user profil ozeti
- job detail ve customer request detail icinde rating giris noktasi

Kapsam disi birakilanlar:

- notification
- rating edit
- rating delete
- yorumlara cevap
- dispute / itiraz
- admin moderasyon
- public profil sayfasi
- bagimsiz genel puan verme akisi

# Önerilen Backend Yapısı

`ratings` modulu placeholder olmaktan cikarilip gercek hale getirildi:

- `ratings.module.ts`
- `ratings.controller.ts`
- `ratings.service.ts`
- `ratings.repository.ts`
- `dto/`

Ek olarak:

- `RatingsModule` artik `AppModule` icine import ediliyor
- jobs ve transport-requests read modelleri `ratingContext` tasiyor
- rating karari jobs modulu icine dagitilmadi; create karari ratings modulu icinde tutuldu

Bu sayede domain karari tek yerde toplandi, ama mevcut job/request detail ekranlari rating giris noktasi olarak korunabildi.

# Önerilen Endpointler

Bu fazda eklenen resmi backend yuzeyi:

- `POST /api/v1/ratings/jobs/:jobId`
- `GET /api/v1/ratings/my/given`
- `GET /api/v1/ratings/my/received`
- `GET /api/v1/ratings/my/summary`

Mevcut endpoint genisletmeleri:

- `GET /api/v1/jobs/:jobId` artik `ratingContext` donuyor
- `GET /api/v1/transport-requests/:id` icindeki `nakliye` ozeti artik `ratingContext` donuyor

`POST /api/v1/ratings/jobs/:jobId` body:

- `puanDegeri`
- `yorum?`

Server tarafinda uretilen alanlar:

- `puanlayanId`
- `puanlananId`
- `nakliyeId`
- `puanTanimId = SAYISAL_1_5`

# DTO / Validation Yaklaşımı

Bu fazda kullanilan ana DTO'lar:

- `CreateRatingDto`
- `SubmittedRatingResponseDto`
- `RatingContextResponseDto`
- `RatingListItemResponseDto`
- `MyRatingSummaryResponseDto`

Validation karari:

- `puanDegeri` zorunlu
- integer olmali
- `1..5` araliginda olmali
- `yorum` opsiyonel
- yorum girilirse trim edilir ve `500` karakter ile sinirlanir

Secilen urun tercihi:

- yorum opsiyonel
- sayisal puan zorunlu

# Rol ve Yetki Kuralları

Kim rating verebilir:

- yalnizca shipment taraflarindan biri
- yani musteri veya nakliyeci

Ne zaman verebilir:

- yalnizca `NAKLIYE / TAMAMLANDI` sonrasi

Kim kimi puanlar:

- musteri yalnizca kendi tamamlanmis isindeki nakliyeciyi puanlar
- nakliyeci yalnizca kendi tamamlanmis isindeki musteriyi puanlar

Engellenen durumlar:

- job tamamlanmadan rating verme
- ayni is ve ayni yon icin ikinci rating verme
- kendi kendine puan verme
- shipment tarafi olmayan kullanicinin rating verme girisimi

Bu fazda rating immutable kabul edildi:

- edit yok
- delete yok

# Frontend Tarafında Gerekli Minimum Akış

Create giris noktalari planlandigi gibi mevcut is ekranlarinda tutuldu:

- musteri: `/dashboard/isteklerim/[id]`
- nakliyeci: `/dashboard/nakliyelerim/[id]`

Bu iki ekranda:

- shipment tamamlanmadiysa rating alani bekleme mesajiyla gorunur
- shipment tamamlandiysa ve current user henuz rating vermediyse form acilir
- rating verildiyse ayni alanda gonderilen puan ozeti gosterilir

Ayrica iki yeni kullanilabilir ekran dolduruldu:

- `/dashboard/puanlarim`
- `/dashboard/profil`

`/dashboard/paun_ver` bu fazda resmi giris noktasi yapilmadi; placeholder durumda kaldi.

Shell gorunurlugu de tamamlandi:

- musteri shell: `Puanlarim`, `Profil`
- nakliyeci shell: `Puanlarim`, `Profil`

# Profil Özeti ve Ortalama Puan Yaklaşımı

Profil ozeti su sade modelle acildi:

- `Nakliyeci puanim`
- `Musteri puanim`
- her biri icin toplam degerlendirme sayisi

Ilk fazda özellikle alinmayanlar:

- son 3 yorum
- histogram
- puan dagilim grafigi
- trend
- leaderboard benzeri cache mantigi

Bu karar ilk fazi dar tuttu ve aggregation'i gereksiz yere buyutmedi.

# Bilinçli Olarak Sonraya Bırakılanlar

- notifications
- yorumlara cevap verme
- rating edit
- rating delete
- dispute / itiraz
- admin moderasyon
- public profil ozet endpoint'i
- public baska kullanici puanlarini gorme
- pagination / search / filters
- bagimsiz genel puan verme akisi
- PrimeReact veya buyuk UI redesign

# Alternatif Başlangıç Yolları ve Neden Seçilmedi

Once notifications:

- rating event seti daha yeni olgunlasti
- support layer'i oncelemek yerine veri ureten domain once acildi

Bagimsiz genel puan:

- baglamsiz olurdu
- dogrulanmis is iliskisine dayanmazdi
- suistimale acik kalirdi

Tek tarafli rating:

- yalnizca nakliyeciyi puanlamak customer guvenilirligini hic olcmezdi
- bu nedenle iki tarafli model secildi

Edit/delete ilk fazda acilsin:

- audit ve itiraz ihtiyaci dogurur
- ilk fazi gereksiz buyutur
- immutable rating daha dar ve daha savunulabilir kalir

# Uygulama Sırası Önerisi

Bu adim su sirayla uygulandi:

1. Prisma schema'da uniqueness ve index kurallari tanimlandi
2. Rating tipi seed migration'i eklendi ve uygulandi
3. `ratings` modulu controller/service/repository ile acildi
4. jobs ve transport-requests detail read modellerine `ratingContext` eklendi
5. web tarafinda rating create helper'lari ve ortak access hook'u eklendi
6. carrier job detail ve customer request detail rating giris noktasi oldu
7. `Puanlarim` ve `Profil` sayfalari dolduruldu
8. shell navigasyonu gorunur hale getirildi
9. Prisma generate + build + lint kontrolleri tamamlandi

# Toplantıda Kullanılacak Kısa Savunma Metni

Sıradaki doğru modül notifications degil ratings’ti. Cunku sistem artik isi gerçekten tamamlayabiliyor ve puan ancak `NAKLIYE / TAMAMLANDI` sonrasında anlamli hale geliyor. Ana kayıt birimini `Nakliye` secerek puani dogrulanmis bir is iliskisine bagladik. Ayrı genel puan akisi acmadik; profil puanini is bazli ratinglerin ortalamasindan turettik. Iki tarafli rating sectik cunku hem musteri hem nakliyeci davranisi olculmeli. Ilk fazi dar tuttuk: create, verdigim/aldigim listeleri ve profil ozeti. Edit, delete, dispute ve notifications sonraya birakildi.
