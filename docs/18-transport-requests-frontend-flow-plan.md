# Frontend Transport Requests Akisi

## Amaç

Bu adimin amaci, backend tarafinda hazir olan `transport-requests` endpointlerini musteri icin gercek ve tutarli bir frontend akisina donusturmektir.

Bu fazin resmi kapsami yalnizca su uc ekrandir:
- `/dashboard/istek_ekle`
- `/dashboard/isteklerim`
- `/dashboard/isteklerim/[id]`

Uygulama kararlari:
- uc sayfada auth ve rol kontrolu ayni kucuk ortak helper ile cozuldu
- localStorage tabanli auth kontrolu nedeniyle kesin loading gate korundu
- detay ekraninda `404` icin bulunamadi mesaji korundu

## Neden Sıradaki Faz Frontend Transport Requests Akışı

- Backend’de `create + my list + detail` endpointleri varken bunlari kullaniciya gostermemek dikey dilimi yari birakir.
- Gercek urun degeri, musterinin istek olusturup kendi kaydini gorebilmesiyle baslar.
- Yeni domain secmek yerine mevcut backend halkasini kullanici deneyimine tasimak daha mantiklidir.
- Auth foundation ve ilk backend domain halkasi hazirken siradaki dogru adim, bunu web tarafinda kullanilabilir hale getirmektir.

## Neden Vehicles Henüz Sıradaki Faz Değil

- `vehicles` nakliyeci hazirlik alanidir; musteri talep akisi gorunur olmadan urunun ana dongusu eksik kalir.
- Vehicle modulu simdi acilsa, mevcut transport-request yatirimi kullaniciya acilmadan yeni halka eklenmis olur.
- Register ekranindaki arac alanlari bugun resmi vehicle urun akisi sayilmiyor.
- Once musteri talebi gorunur ve kullanilabilir olmali, sonra nakliyeciye bagli moduller gelmelidir.

## Mevcut Altyapıdan Bu Fazda Ne Kullanılacak

- `apps/web/src/lib/auth/auth-storage.ts`
- `apps/web/src/lib/auth/use-customer-page-access.ts`
- `apps/web/src/lib/api/api-client.ts`
- `apps/web/src/lib/api/transport-requests.ts`
- backend endpointleri:
  - `POST /api/v1/transport-requests`
  - `GET /api/v1/transport-requests/my`
  - `GET /api/v1/transport-requests/:id`
- mevcut login/register sonrasi auth kaydi

Bu fazda buyuk route guard sistemi veya global auth framework kurulmadi.

## Bu Fazda Ürün Kararı Sayılmayan Sayfalar

Bu fazin urun karari sayilmayan sayfalari:
- `apps/web/src/app/hakkimizda/page.tsx`
- `apps/web/src/app/iletisim/page.tsx`

Ayrica bu fazin merkezinde olmayan dashboard placeholder sayfalari:
- `/dashboard/acik_istekler`
- `/dashboard/arac_ekle`
- `/dashboard/araclarim`
- `/dashboard/teklif_ver`
- `/dashboard/tekliflerim`
- diger puan/profil sayfalari

Bu sayfalar temizlenmedi ve bu fazin resmi urun akisina dahil edilmedi.

## İlk Fazın Frontend Kapsamı

Bu fazda acilan net urun kapsami:
- musteri istek olusturabilir
- musteri kendi isteklerini listeleyebilir
- musteri kendi isteginin detayini gorebilir

Kapsam disi birakilanlar:
- vehicles
- offers
- jobs
- ratings
- notifications
- dashboard redesign
- home/navbar urun kesfi iyilestirmesi
- harita/autocomplete
- global protected route sistemi

## Gerekli Sayfalar ve Sorumlulukları

### `/dashboard/istek_ekle`

- musteri create formudur
- alanlar:
  - `baslangicSehri`
  - `varisSehri`
  - `baslangicEnlem`
  - `baslangicBoylam`
  - `varisEnlem`
  - `varisBoylam`
  - `yukDetay`
- koordinatlar sade numeric input ile alinir
- basarili create sonrasi detay sayfasina yonlenir
- ic link olarak `Isteklerime git` bulunur

### `/dashboard/isteklerim`

- giris yapan musterinin kendi kayitlarini listeler
- her kartta rota, durum, tarih ve kisa yuk ozeti bulunur
- her kart detay ekranina link verir
- bos durumda create ekranina yonlendiren empty state gosterilir

### `/dashboard/isteklerim/[id]`

- tek istegin detay ekranidir
- minimum alanlar:
  - `id`
  - `durum`
  - `olusturmaTarihi`
  - `baslangicSehri`
  - `varisSehri`
  - koordinatlar
  - `yukDetay`
- ic linkler:
  - `Listeye don`
  - `Yeni istek`

## API Entegrasyon Planı

Mevcut helper yeterli kabul edildi:
- `createTransportRequest(input, accessToken)`
- `getMyTransportRequests(accessToken)`
- `getTransportRequestDetail(id, accessToken)`

Kararlar:
- page component’ler endpoint path’lerini dogrudan bilmez
- token `auth-storage` kaydindan gelir
- `Authorization: Bearer ...` ile gonderilir
- response mapping minimum tutulur
- tarih alani frontend’de formatlanir

Hata davranislari:
- `401`: local auth temizlenir ve `/login` yonlendirmesi yapilir
- `403`: `/` yonlendirmesi yapilir
- `404`: yalnizca detay ekraninda inline bulunamadi mesaji gosterilir

## Auth ve Rol Kontrolü Yaklaşımı

Uc sayfada auth kontrolu kopya kopya yazilmak yerine ayni ortak helper’a tasindi.

Kullanilan helper:
- `useCustomerPageAccess()`

Donen minimum bilgi:
- `status: "checking" | "ready" | "redirecting"`
- `accessToken: string | null`

Helper sorumluluklari:
- `getStoredAuth()` ile auth kaydini okumak
- auth yoksa `/login` redirect karari vermek
- auth var ama `MUSTERI` degilse `/` redirect karari vermek
- auth uygun ise access token dondurmek
- sayfa icerigi render edilmeden once loading gate’i korumak

Kesin davranis:
- uc sayfanin tamami ayni helper’i kullanir
- helper `ready` olmadan sayfa icerigi render edilmez
- boylece localStorage tabanli auth kontrolunde yanlis ekranin bir an gorunmesi engellenir

## Minimum UX Akışı

1. Kullanici auth olmus halde sisteme girer.
2. Musteri `/dashboard/istek_ekle` sayfasina gider.
3. Formu doldurur ve istegi olusturur.
4. Basarili create sonrasi detay ekranina gider.
5. `isteklerim` sayfasinda kendi kayitlarini gorur.
6. Listeden detay ekranina gecer.
7. Yanlis rol veya auth yoksa bu akisa alinmaz.

Bu fazda urun kesfi minimum seviyede tutuldu; asil hedef uc ekranin kendi icinde calisan musteri akisidir.

## Hata / Loading / Empty State Yaklaşımı

Loading:
- auth kontrolu icin ortak loading gate
- liste fetch sirasinda sade loading alani
- detay fetch sirasinda sade loading alani
- create submit sirasinda disabled button + metin degisimi

Error:
- create ekraninda minimal hata bildirimi
- liste ekraninda inline hata blogu
- detay ekraninda:
  - `404` icin bulunamadi mesaji
  - diger hatalar icin genel hata blogu

Empty state:
- yalnizca `isteklerim` ekraninda net empty state
- `Ilk istegi olustur` aksiyonu gorunur

Kesin kararlar:
- detay `404` davranisi aynen korundu
- loading gate zorunlu tutuldu
- toast sistemi eklenmedi

## Bilinçli Olarak Sonraya Bırakılanlar

- vehicles modulu
- nakliyeci akisi
- offers / jobs / ratings / notifications
- home veya navbar’dan role-aware CTA acilmasi
- dashboard genel layout/redesign
- harita, autocomplete, geocoding
- buyuk state management
- global route guard sistemi
- `hakkimizda` ve `iletisim` temizligi
- diger demo/placeholder sayfalarin urunlestirilmesi

## Alternatif Sonraki Fazlar ve Neden Şimdilik Seçilmedi

`vehicles` ile devam etmek:
- musteri akisina gorunen deger acmadan yeni halka acar

Eski demo sayfalarini temizlemek:
- kod hijyeni saglar
- ama urun akisina yeni deger acmaz

Navbar/home gorunurlugunu once cozumlemek:
- kesfedilebilirligi artirir
- ama arka planda resmi musteri akisi netlesmeden kozmetik kalir

Bu yuzden once frontend transport-requests akisinin tamamlanmasi daha mantikliydi.

## Uygulama Sırası Önerisi

Bu adimda izlenen siralama:
1. uc ekran disindaki alanlar kapsam disi tutuldu
2. ortak auth/role helper tanimlandi
3. helper uzerinden kesin loading gate uygulandi
4. `istek_ekle` create davranisi helper’a baglandi
5. `isteklerim` liste davranisi helper’a baglandi
6. `isteklerim/[id]` detay davranisi helper’a baglandi
7. `404` detay mesaji korundu
8. build ve lint kontrolleri calistirildi

Kontrol notlari:
- `npx eslint src/app/dashboard/istek_ekle/page.tsx src/app/dashboard/isteklerim/page.tsx src/app/dashboard/isteklerim/[id]/page.tsx src/lib/auth/use-customer-page-access.ts` gecti
- `npm run lint:web` gecti
- `npm run build:web` bu fazdan bagimsiz olarak `apps/web/src/app/iletisim/page.tsx` dosyasi bos oldugu icin ve module export etmedigi icin gecmiyor

## Toplantıda Kullanılacak Kısa Savunma Metni

Backend’de transport-requests ilk domain halkasi acildiktan sonra siradaki dogru adim, bunu musteri tarafinda gercek urun akisina cevirmektir. Cunku endpoint acmak tek basina urun degeri uretmez; musteri istek olusturup kendi kaydini goremedigi surece sistem hala auth-demodan oteye gecmemis olur.

Bu nedenle yeni domain modulu secmek yerine once mevcut halkayi dikey olarak tamamlamak daha dogrudur. Bu fazda yalnizca uc musteri ekrani resmilestirildi, ortak auth helper ile tekrar azaltildi, loading gate ile yanlis ekran flasi engellendi ve detay ekraninda `404` davranisi korundu.
