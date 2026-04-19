# Amaç

Bu adımda teklif akışı, sadece teklif verme ve listeleme seviyesinden müşteri kararının gerçek iş kaydına donustugu seviyeye tasindi. Hedef; gelen tekliflerden birinin kabul edilmesiyle resmi `Nakliye` kaydi olusturmak, request/offer durumlarini tutarli guncellemek ve bu yeni akisa uygun minimum UX tamamlama islerini bitirmekti.

# Bu Adımda Ne Değişti

- `offers` modulu kabul ve red kararlarini destekler hale geldi.
- Kabul edilen tekliften ayni transaction icinde gercek `Nakliye` kaydi olusturuluyor.
- `transport-requests` detail cevabi artik opsiyonel nakliye ozeti de donuyor.
- `jobs` modulu bos placeholder olmaktan cikip `GET /api/v1/jobs/my` ile aktif nakliye listesini doner hale geldi.
- Teklif olusturma formu artik secilen aktif araci body'de gonderiyor.
- Musteri request detail ekranina `Kabul Et` ve `Reddet` aksiyonlari eklendi.
- Nakliyeci tarafina `/dashboard/nakliyelerim` liste ekrani eklendi.
- Ana sayfa CTA'lari ve nakliyeci shell menusu eksiksiz hale getirildi.
- `hakkimizda` ve `iletisim` sayfalari sade statik urun metnine indirildi.
- `TEKLIF/KABUL_EDILDI`, `TEKLIF/REDDEDILDI`, `ISTEK/ANLASILDI` ve `NAKLIYE/BASLATILDI` durumlari icin yeni seed migration eklendi ve uygulandi.

# Neden Bu Aşamada Offer Acceptance Açıldı

`transport-requests`, `vehicles` ve `offers` ilk fazlari tamamlandiktan sonra sonraki dogal is halkasi teklif karari ve anlasilan isin resmi kayda donusmesiydi. Bu adim, urunu ilk kez gercek is akisi uretebilir hale getiriyor:

- musteri request aciyor
- nakliyeci teklif veriyor
- musteri tekliflerden birini seciyor
- sistem o secimi `Nakliye` kaydina donusturuyor

Boylece teklif verme, sadece bilgi toplama adimi olmaktan cikti ve gercek operasyon baslangici oldu.

# Kabul Kararı ve Nakliye Oluşturma Yaklaşımı

Bu fazda iki karar alindi:

- Musteriye hem `Kabul Et` hem `Reddet` aksiyonu verildi.
- Arac secimi acceptance anina birakilmadi; teklif olustururken secilen aktif arac teklife baglandi.

Secilen yaklasim soyle calisiyor:

1. Nakliyeci teklif verirken aktif araclarindan birini secer.
2. Musteri kendi request detail ekraninda gelen teklifleri gorur.
3. `Kabul Et` basildiginda ayni transaction icinde:
   - secilen teklif `KABUL_EDILDI`
   - diger acik teklifler `REDDEDILDI`
   - request `ANLASILDI`
   - `Nakliye` kaydi `BASLATILDI`
4. `Nakliye.anlasilanFiyat` kabul edilen teklif fiyatindan gelir.

`Teklif.aracId` repo gerceginde zaten nullable duruyordu. Bu adimda DB alanini sikilastirmak yerine yeni tekliflerde DTO/service seviyesinde zorunlu kullanildi. Boylece mevcut veriyle uyum korundu, ama yeni kabul akisi aracsiz teklifi kabul etmez hale geldi.

# Status / Durum Geçişleri

Bu adimda magic numeric id kullanilmadi. Tum durumlar `durumTuru + durumAdi` ile cozuluyor.

Aktif gecisler:

- teklif olusturma: `TEKLIF / OLUSTURULDU`
- teklif reddetme: `TEKLIF / REDDEDILDI`
- teklif kabul etme:
  - secilen teklif: `TEKLIF / KABUL_EDILDI`
  - diger acik teklifler: `TEKLIF / REDDEDILDI`
  - request: `ISTEK / ANLASILDI`
  - nakliye: `NAKLIYE / BASLATILDI`

Ek kararlar:

- Yalnizca `TEKLIF / OLUSTURULDU` durumundaki teklifler reddedilebilir.
- Ayni request ikinci kez kabul edilemez.
- Request icin `Nakliye` olustuysa sonraki kabul/red denemeleri `409` cizgisinde kapanir.
- `Nakliye.istekId @unique` yarismada son guvenlik hattidir; unique cakisma `409 Conflict`e cevrilir.

# Backend Tarafında Yapılanlar

Offers:

- `POST /api/v1/offers/requests/:requestId` artik `aracId` aliyor.
- `POST /api/v1/offers/:offerId/accept` eklendi.
- `POST /api/v1/offers/:offerId/reject` eklendi.
- Offer response ve liste DTO'lari `aracId` ve `aracPlaka` tasir hale geldi.
- Repository sorgulari ve ownership dogrulamasi secilen aktif arac kuralini uctan uca yansitacak sekilde guncellendi.
- Kabul transaction'i icinde request uygunlugu, mevcut `Nakliye`, offer durumu ve diger acik tekliflerin kapanmasi birlikte ele alindi.

Jobs:

- `jobs` modulu gercek provider/controller/repository ile dolduruldu.
- `GET /api/v1/jobs/my` eklendi.
- Bu endpoint rola gore scope'lanir:
  - `NAKLIYECI`: kendi ustundeki nakliyeler
  - `MUSTERI`: kendi request'lerinden dogan nakliyeler

Transport requests:

- Request detail select'i opsiyonel `nakliye` ozetini de kapsayacak sekilde genislendi.
- `update` ve `delete` akislari, artik anlasilmis veya nakliyeye donusmus request'ler icin `409` verir.

Migration:

- `20260417180000_seed_offer_acceptance_and_job_statuses` eklendi ve lokal DB'ye uygulandi.

# Frontend Tarafında Yapılanlar

Musteri tarafi:

- `/dashboard/isteklerim/[id]` icindeki `Gelen teklifler` bolumune `Kabul Et` ve `Reddet` butonlari eklendi.
- Sadece `OLUSTURULDU` durumundaki tekliflerde aksiyon gosteriliyor.
- Teklif kabul edildiginde ayni sayfada `Olusan nakliye` ozeti goruluyor.
- Request artik anlasilmissa `Duzenle` ve `Sil` aksiyonlari gizleniyor.

Nakliyeci tarafi:

- `/dashboard/acik_istekler/[id]` teklif formuna aktif arac secimi eklendi.
- Tek aktif arac varsa onsecili geliyor; birden fazla varsa secim zorunlu.
- `/dashboard/tekliflerim` artik secilen aracin plakasini da gosteriyor.
- Yeni ekran acildi: `/dashboard/nakliyelerim`

API helper katmani:

- `offers.ts` artik `aracId`, `aracPlaka`, `acceptOffer` ve `rejectOffer` helper'larini kapsiyor.
- Yeni `jobs.ts` helper dosyasi eklendi.
- `transport-requests.ts` detail tipi opsiyonel `nakliye` ozeti tasiyor.

# Ana Sayfa ve Dashboard Navigasyon Düzenlemeleri

Ana sayfa CTA'lari role-aware hale getirildi:

- `MUSTERI`: `Istek Ekle`, `Isteklerim`
- `NAKLIYECI`: `Arac Ekle`, `Araclarim`, `Acik Istekler`, `Tekliflerim`

Dashboard shell menuleri:

- Musteri shell mevcut cizgide korundu:
  - `Istek Ekle`
  - `Isteklerim`
- Nakliyeci shell genislendi:
  - `Arac Ekle`
  - `Araclarim`
  - `Acik Istekler`
  - `Tekliflerim`
  - `Nakliyelerim`

Bu adimda buyuk bir tasarim degisikligi yapilmadi; sadece eksik giris noktalari tamamlandi.

# Hakkimizda / Iletisim Sadeleştirmesi

Bu iki sayfa daha once demo/placeholder mantigi tasiyordu. Bu adimda:

- gereksiz state ve fetch mantigi kaldirildi
- client component zorunlulugu kaldirildi
- yerine sade, statik ve build-safe urun metni kondu

Amac tasarim buyutmek degil, bos veya alakasiz sayfa davranisini temizlemekti.

# Role ve Ownership Kuralları

Offers:

- Teklif olusturma yalnizca `NAKLIYECI`
- Acik request listesi ve detail yalnizca `NAKLIYECI`
- Teklif kabul/reddi yalnizca request sahibi `MUSTERI`
- Nakliyeci kendi request'ine teklif veremez
- Nakliyeci yalnizca kendi aktif araci ile teklif verebilir

Jobs:

- `jobs/my` iki rol icin acik olsa da veri her rol icin kendi kapsaminda doner

Transport requests:

- Musteri yalnizca kendi request detail ekraninda karar verir
- Anlasilan request tekrar update/delete edilemez

Soft delete uyumu:

- Soft deleted request teklif kabul/red cizgisinde `404/409` ile kapanir
- Soft deleted arac ile yeni teklif verilemez
- Soft deleted araca bagli legacy teklif kabul edilmek istendiginde `409` verir

# Test / Kontrol Sonuçları

Calistirilan komutlar:

- `npm run prisma:generate` (`apps/api`)
- `npx prisma migrate deploy` (`apps/api`)
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Sonuc:

- Prisma client guncellendi
- Yeni status seed migration'i uygulandi
- API build gecti
- API lint gecti
- Web build gecti
- Web lint gecti

Kontrol edilen ana senaryolar:

- aktif arac secerek teklif olusturma
- musterinin `OLUSTURULDU` teklifi kabul etmesi
- kabul sonrasi `Nakliye` kaydi olusmasi
- diger acik tekliflerin otomatik `REDDEDILDI` olmasi
- anlasilmis request'in tekrar duzenlenememesi / silinememesi
- nakliyecinin `/dashboard/nakliyelerim` ekraninda isi gorebilmesi

# Bilinçli Olarak Yapılmayanlar

- job/nakliye detail ekrani
- teklif geri cekme
- teklif tekrar acma
- ratings
- notifications
- SSR auth / cookie auth / middleware auth
- PrimeReact veya baska buyuk UI kutuphanesi gecisi
- genel dashboard redesign
- teklif filtreleme / arama / sayfalama
- admin modulu

# Sonraki Mantıklı Adım

Bir sonraki mantikli faz:

- aktif nakliye detail / ilerleme ekranini acmak
- nakliye durum gecislerini daha zengin hale getirmek
- musterinin kabul ettigi is uzerinden sonraki operasyon adimlarini acmak
- teklif tekrar acma veya ileri faz karar akislarini urun ihtiyacina gore netlestirmek
