# Amac

Bu adimin amaci, yeni domain modulu acmadan once uygulamanin gorunen yuzunu toparlamak ve mevcut request / vehicle / offer / job akislarini daha okunur bir bilgi mimarisi icinde sunmakti.

Odak bu fazda backend buyutmek degildi. Web katmaninda:

- ana sayfa girisini daha anlamli hale getirmek
- rol bazli CTA hiyerarsisini netlestirmek
- navbar ve dashboard menu dilini standardize etmek
- liste ekranlarini "kesif listesi" ve "yonetim listesi" diye ayristirmak
- empty state, badge ve ozet kartlarini ortak bir gorunum diline toplamak

hedeflendi.

# Bu Adimda Ne Degisti

- Ana sayfa yeniden kurgulandi.
- Misafir, `MUSTERI` ve `NAKLIYECI` icin farkli giris senaryolari gorunur hale getirildi.
- Navbar aktif link, `Panelim` kisayolu ve mobil menu ile daha tutarli hale getirildi.
- Müşteri ve nakliyeci shell yapilari gorunur olarak ortak bir dashboard frame uzerine tasindi.
- `Acik Istekler` sayfasi kesif listesi mantigina daha yakin bir toolbar + sonuc akisi kazandi.
- `Isteklerim`, `Araclarim`, `Tekliflerim` ve `Nakliyelerim` sayfalarina ortak yonetim listesi dili uygulandi.
- Tekrar eden UI ihtiyaclari icin kucuk presentation primitive'ler eklendi:
  - `DashboardShellFrame`
  - `StatusBadge`
  - `SummaryStatCard`
  - `EmptyStateCard`
  - `CollectionToolbar`
- `Hakkimizda` ve `Iletisim` sayfalari yeni yuzey ritmine uyacak sekilde hafif guncellendi.
- Global tipografi ve body yuzeyi Geist + `font-sans` ile hizalandi.

# Neden Bu Asamada UI/UX Toparlama Acildi

Bu noktada urun artik yalnizca demo sayfalardan ibaret degil:

- musteri request olusturabiliyor
- nakliyeci arac yonetebiliyor
- teklif verilebiliyor
- teklif kabul edilebiliyor
- nakliye/job akisi acildi

Ama bu domain olgunlugu ekranda ayni netlikte gorunmuyordu. Ozellikle:

- ana sayfa misafir kullaniciya zayif bir giris sunuyordu
- navbar ile dashboard menusu ayni hikayeyi anlatmiyordu
- listeler calisiyordu ama hepsi ayni kart tekrarina benziyordu
- `Acik Istekler` ile `Araclarim` gibi sayfalar farkli kullanim amacina sahip olduklari halde benzer yuzey dili kullaniyordu

Bu yuzden sonraki dogru adim yeni moduller degil, mevcut urunun anlasilirligini artirmakti.

# Ana Sayfa ve Rol Bazli Giris Deneyimi

Ana sayfa uc duruma gore yeniden dusunuldu:

- misafir
- `MUSTERI`
- `NAKLIYECI`

Misafir yuzunde:

- urunun ne yaptigini anlatan daha net hero metni eklendi
- iki farkli rol karti gorunur hale getirildi:
  - `Yuk gondermek istiyorum`
  - `Tasima isi bulmak istiyorum`
- her kart kendi register / login yolunu tasiyor

Auth'li kullanicida:

- ana sayfa buyuk pazarlama alani olmaktan cikti
- bir "mini launchpad" gibi davranmaya basladi

`MUSTERI` icin:

- `Istek Ekle`
- `Isteklerim`

agirlikli gorunur.

`NAKLIYECI` icin:

- `Acik Istekler`
- `Tekliflerim`
- `Nakliyelerim`
- `Araclarim`

giris noktalari one cikarildi.

`Arac Ekle` ozellikle yardimci / onboarding aksiyonu gibi daha dusuk agirlikta tutuldu.

# Navbar ve Dashboard Menu Kararlari

Navbar yuksek seviye yon bulma alani olarak korundu.

Ust seviyede kalanlar:

- `Ana Sayfa`
- `Hakkimizda`
- `Iletisim`
- auth sonrasi `Panelim`
- selamlama
- `Cikis Yap`

Operasyonel derin linkler navbar'a tasinmadi. Bunlar dashboard shell tarafinda kaldi.

Dashboard tarafinda karar su oldu:

- tek monolitik shell yerine
- tek ortak frame + rol bazli wrapper

kullanilsin.

Bu nedenle:

- `CustomerTransportRequestsShell`
- `CarrierVehiclesShell`

gorunur olarak ayni ana frame uzerine oturtuldu ama rol bazli menu yapilari ayri tutuldu.

Nakliyeci menusu de yeniden onceliklendirildi:

- `Acik Istekler`
- `Tekliflerim`
- `Nakliyelerim`
- `Araclarim`
- `Arac Ekle`

Bu sira, gunluk operasyon akisini daha iyi yansitiyor.

# Liste Gorunum Dili Karari

Bu fazda iki farkli liste dili netlestirildi:

## 1. Kesif Listesi

Pilot sayfa:

- `Acik Istekler`

Bu sayfada:

- sonuc toolbar'i eklendi
- sonuc sayisi gorunur hale geldi
- `Filtreler ve siralama yakinda` ipucu acikca verildi
- ama sahte filtre input'u eklenmedi

Bu karar, sayfayi gelecekteki pazaryeri / kesif listesine hazirlar ama bugun olmayan davranisi taklit etmez.

## 2. Yonetim Listesi

Sayfalar:

- `Isteklerim`
- `Araclarim`
- `Tekliflerim`
- `Nakliyelerim`

Bu sayfalarda:

- ozet bilgi daha hiyerarsik hale getirildi
- aksiyonlar sag blokta daha tutarli yerlesti
- liste ustune kucuk summary kartlari eklendi
- kart yogunlugu ve metin clamp davranisi standardize edildi

# Acik Istekler Icin Kesif Iskeleti

`Acik Istekler` sayfasinda su iskelet uygulandi:

1. sayfa basligi
2. summary strip
3. collection toolbar
4. sonuc listesi
5. empty state

Toolbar'da bugun yalnizca:

- sonuc sayisi
- kesif baglam metni
- `Filtreler ve siralama yakinda`

gorunuyor.

Yani:

- layout future-ready
- backend query param yok
- gercek filtre motoru yok
- sahte dropdown veya disabled form alanlari da yok

Bu, "sahibinden benzeri" gelecege giden ilk duzgun iskelet olarak secildi.

# Empty State / Badge / Ozet Kart Yaklasimi

Bu fazda ortak dil su sekilde uygulandi:

## Empty state

- ilk kayit yoksa net CTA ver
- gecici kesif boslugunda sakin bilgi ver
- hata ile bos sonucu karistirma

## Badge

`StatusBadge` ile renkler semantik olarak hizalandi:

- yeni / acik durumlar: mavi
- surecte olanlar: amber
- olumlu terminal veya kabul edilenler: yesil
- reddedilen / iptal edilenler: kirmizi
- notr etiketler: gri

## Ozet kartlari

Sayfa ustunde 2-3 kucuk summary karti kullanildi:

- `Isteklerim`: toplam, acik, anlasilan
- `Araclarim`: toplam arac, toplam kapasite, en yeni model
- `Tekliflerim`: toplam, acik, kabul edilen
- `Nakliyelerim`: toplam, aktif, tamamlanan
- `Acik Istekler`: toplam, yeni firsat, takip edilen

Bu kartlar yalnizca mevcut liste verisinden turetildi; yeni backend aggregation endpoint ihtiyaci dogurulmadi.

# Hakkimizda / Iletisim Uyum Duzenlemesi

Bu iki sayfa yeniden tasarlanmadi.

Yapilan sey:

- genel `slate` yuzey diliyle uyumlu hale getirmek
- border / spacing / metin rengi ritmini ana yuzeyle esit tutmak

Yani bu fazda:

- yeni kurumsal icerik stratejisi yazilmadi
- sadece urun yuzeyiyle gorsel kopukluk azaltildi

# Test / Kontrol Sonuclari

Calistirilan komutlar:

- `npm run build:web`
- `npm run lint:web`

Sonuc:

- web build gecti
- web lint gecti

Not:

- bu adimda backend, DB veya endpoint sozlesmesi degistirilmedi

# Bilincli Olarak Yapilmayanlar

- PrimeReact entegrasyonu
- component library migration
- canli mesajlasma
- gercek zamanli teklif pazarligi
- rota sapmasi / ara durak eslesme
- gelismis cografi filtreleme
- gercek arama / siralama / pagination motoru
- notification sistemi
- ratings genisletmesi
- admin panel
- SSR auth / cookie auth / middleware auth
- buyuk state management kutuphanesi
- tam landing page redesign

# Sonraki Mantikli Adim

Bu UI/UX toparlama fazindan sonraki mantikli adim:

- `Acik Istekler` sayfasina gercek filtre / siralama modelini kademeli eklemek
- discovery listesi ile offer create akisinin iliski dilini daha da netlestirmek
- gerekiyorsa sonrasinda ratings veya notifications gibi yeni domain halkalarina gecmek

Ama bundan once ana liste ve menu iskeleti artik daha saglam bir taban sunuyor.
