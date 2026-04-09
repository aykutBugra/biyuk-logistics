# API Dizininde Su Ana Kadar Ne Kurduk, Neden Boyle Kurduk, Sirada Ne Var

Bu dokuman yalnizca `apps/api` dizinine odaklanir. Amac, bugune kadar backend tarafinda ne kuruldugunu, register/login akislarinin nasil calistigini, neden bu mimari secildigini ve bir sonraki backend adiminda ne yapacagimizi detayli ve savunulabilir sekilde anlatmaktir.

## 1. Genel Ozet

Su anda `apps/api`, NestJS tabanli, moduler, katmanli ve kontrollu bir backend cekirdegi olarak kurulmus durumdadir.

Bu cekirdek su an icin sunlari gercekten calisir halde saglar:

- uygulamanin ayaga kalkmasi
- config/env yuklemesi
- Prisma uzerinden veritabani erisimi
- auth register/login/refresh/me akisi
- users ve roles tarafinda auth'i destekleyen temel servisler
- request validation
- JWT tabanli kimlik dogrulama
- role temelli temel yetki zemini

Yani backend su an "ilk domain feature'lari gelmeye hazir bir auth cekirdegi" seviyesindedir.

Bu asamada amac tum isi bir anda acmak degildi. Tam tersine:

- once saglam bir bootstrap
- sonra saglam auth/users/roles zemini
- sonra ilk gercek domain modulu

sirasi izlendi.

## 2. Backend Mimarisini Nasil Kurguladik

`apps/api` dizini kaba olarak su parcalardan olusur:

```text
apps/api/
├─ prisma/
│  └─ migrations/
├─ src/
│  ├─ common/
│  ├─ config/
│  ├─ infrastructure/
│  └─ modules/
│     ├─ auth/
│     ├─ roles/
│     ├─ users/
│     ├─ vehicles/
│     ├─ transport-requests/
│     ├─ offers/
│     ├─ jobs/
│     ├─ ratings/
│     └─ notifications/
├─ dist/
└─ package.json
```

Bu yapida temel dusunce sunlardir:

- uygulama tek bir backend reposu gibi degil, kontrollu bir "moduler monolith" gibi organize edildi
- her modulin HTTP girisi, servis mantigi ve repository okuma/yazmasi birbirinden ayrildi
- Prisma dogrudan controller icine sokulmadi
- auth gibi cekirdek bir konu, dogrudan future domain modullerine baglanmadan oturtuldu

Bu secimin ana faydalari:

- hangi kodun HTTP katmani oldugu net
- hangi kodun business logic oldugu net
- hangi kodun DB sorgusu oldugu net
- test ve refactor zamani sinirlar daha okunur
- yeni domain modullerine gecmek daha kolay

## 3. Ana Teknik Katmanlar

### 3.1 `src/main.ts`

Burasi uygulamanin HTTP seviyesinde ayaga kalktigi yerdir.

Burada yaptigimiz kritik seyler:

- Nest application olusturmak
- CORS acmak
- global prefix olarak `api/v1` tanimlamak
- global `ValidationPipe` acmak

Bu secimle birlikte backend'in tum endpointleri tek bir ortak kurala girdi:

- tum endpointler `api/v1` altinda
- DTO validation global olarak aktif
- istek body'lerinde whitelist kurali var
- tanimsiz alanlar reddedilebiliyor

Bu backend dis dunyaya cikis kapisidir.

### 3.2 `src/app.module.ts`

Burasi uygulamanin yuksek seviyedeki wiring dosyasidir.

Burada:

- `ConfigModule`
- `PrismaModule`
- `RolesModule`
- `UsersModule`
- `AuthModule`

birbirine baglandi.

Bu sayede auth modulu users ve roles altyapisini kullanabilir hale geldi.

### 3.3 `src/config/`

Burada iki ana konu var:

- app config
- auth config

Yani port, cors, jwt secret, jwt ttl gibi ortam bagimli ayarlar kodun ortasina dagitilmadi. Merkezi bir config yapisi kullanildi.

Bu karar ileride:

- farkli ortamlar
- docker
- staging
- production

gibi ortamlara cikisi kolaylastirir.

### 3.4 `src/infrastructure/prisma/`

Bu klasor veritabani baglantisinin uygulama tarafindaki altyapi katmanidir.

Buradaki fikir:

- Prisma istemcisi tek yerde yonetilsin
- moduller DB'ye dogrudan yeni client acarak degil, ortak servisle ulassin

Bu, backend tarafinda altyapiyi modullerden ayirmak icin onemlidir.

### 3.5 `src/common/`

Burasi ortak kullanim alanidir.

Icine koydugumuz seyler:

- role sabitleri
- current user decorator
- jwt auth guard
- roles guard
- authenticated user type

Boylece auth ve roles ile ilgili ortak kavramlar module ici tekrar tekrar yazilmadi.

## 4. Neden `auth`, `users` ve `roles` Ayrildi

Bu uc modulu tek klasorde toplamak yerine ayirdik, cunku sorumluluklari farkli:

### `auth`

Dis dunyaya sunulan auth endpointleri ve auth orkestrasyonu burada.

Ornek:

- register
- login
- refresh
- me

### `users`

Kullaniciyi auth icin bulma, olusturma, profile cevirme gibi kullanici merkezli isler burada.

Ornek:

- kullaniciyi mail/kullaniciAdi ile bulmak
- kullaniciyi id ile bulmak
- user profile cevabi uretmek
- yeni user + role baglantisini olusturmak

### `roles`

Rol kaydini cozen, role-name'leri normalize eden ve role endpointlerini saglayan kisim burada.

Ornek:

- role id bulmak
- user role'lerini cekmek
- role konfigurasyonu bozuksa bunu acik hataya cevirmek

Bu ayrim onemlidir. Cunku:

- auth bir "giris kapisi" problemidir
- users bir "kim kullanici?" problemidir
- roles bir "bu kullanici ne yapabilir?" problemidir

Tek dosyada veya tek modulde toplaninca bu ayrim kaybolur.

## 5. Su Anki Auth API Yuzeyi

Su endpointler aktif:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/roles/me`
- `GET /api/v1/roles/admin-probe`
- `GET /api/v1/health`

Bu set, su an icin toplantida sunulabilir minimum backend auth halkasidir.

## 6. Register Akisini Nasil Kurduk

Register backend tarafinda su zincirle calisir:

1. HTTP request controller'a gelir
2. `RegisterDto` validation calisir
3. `AuthService.register()` devreye girer
4. input normalize edilir
5. duplicate mail ve duplicate kullaniciAdi kontrol edilir
6. sifre hashlenir
7. hedef rol id'si cozulur
8. user ve user-role baglantisi transaction ile DB'ye yazilir
9. yeni kullanici icin token cifti uretilir
10. token + sade user response dondurulur

### 6.1 Register Controller

`apps/api/src/modules/auth/auth.controller.ts`

Controller seviyesinde yaptigimiz sey yalindir:

- `POST /auth/register` route'u acilir
- body `RegisterDto` olarak alinir
- request servise iletilir

Burada business logic yoktur. Bu bilerek secildi.

### 6.2 Register DTO

`apps/api/src/modules/auth/dto/register.dto.ts`

Burada su alanlar tanimlandi:

- `ad`
- `soyad`
- `mail`
- `kullaniciAdi`
- `telefonNumarasi?`
- `password`
- `role?`

Validation kararlari:

- `ad`, `soyad`, `kullaniciAdi` string ve bos olamaz
- `mail` email olmak zorunda
- `password` minimum 8 karakter
- `telefonNumarasi` opsiyonel
- `role` sadece `MUSTERI` veya `NAKLIYECI`

DTO seviyesinde trim/normalize kullanmamizin nedeni:

- service katmanina daha temiz veri gelsin
- ayni veri kalitesi her endpointte tekrar tekrar elle kontrol edilmesin

### 6.3 Register Service Orkestrasyonu

`apps/api/src/modules/auth/auth.service.ts`

Buradaki `register()` metodu akisin beyni gibidir.

Bu metodun yaptigi seyler:

#### a. Input normalize etme

- `ad.trim()`
- `soyad.trim()`
- `mail.trim().toLowerCase()`
- `kullaniciAdi.trim().toLowerCase()`
- `telefonNumarasi?.trim() || null`
- `role ?? MUSTERI`

Buradaki mantik su:

- mail ve kullaniciAdi case-insensitive dusunulsun
- veritabani ve login akisi daha tutarli olsun

#### b. Duplicate kontrolu

Register'dan once su iki kontrol yapilir:

- `existsByMail`
- `existsByUsername`

Bu kontrolun register'dan once yapilmasinin nedeni:

- kullaniciya daha acik hata vermek
- veritabani unique hatasini dogrudan kullaniciya yansitmamak

Yine de race-condition ihtimaline karsi DB tarafindan gelebilecek `P2002` hatasi da `409 Conflict`'e cevrilir.

Yani duplicate korumasi iki seviyelidir:

- once uygulama seviyesi kontrol
- sonra DB unique hatasini conflict'e cevirme

#### c. Password hashleme

`bcryptjs.hash(password, 12)` kullanildi.

Bu secim:

- sifrenin duz metin tutulmamasini saglar
- auth icin kabul edilebilir bir temel guvenlik seviyesi verir

#### d. Rol cozme

Register asamasinda `roleName` once `RolesService.requireRoleId()` ile DB'deki role id'ye cevrilir.

Eger rol kaydi yoksa:

- auto-seed yok
- sessiz fallback yok
- acik `500` var

Bu karar ozellikle secildi. Cunku:

- auth kodunun gizlice DB mutasyonu yapmasi istenmedi
- rol konfigurasyonu problemi isletimsel bir problem olarak acik gorunsun istendi

#### e. User + role olusturma

Bu kisim `UsersService` uzerinden repository'ye iner.

Ama asil DB yazimi `UsersRepository.createWithRole()` icinde transaction ile yapilir:

- once `Kullanici` kaydi olusur
- sonra `KullaniciRol` kaydi olusur
- sonra olusan kullanici role bilgisiyle birlikte tekrar okunur

Bu tasarim onemli, cunku:

- kullanici olustu ama role baglanamadi gibi yari basarili durumlar istenmez
- transaction ile bu iki adim atomik hale gelir

#### f. Token uretme

Register basarili olunca login ile ayni token response'u dondurulur.

Bu secimin nedeni:

- register sonrasi kullaniciyi tekrar login olmaya zorlamamak
- toplanti demosunda `register -> me` zincirini dogrudan gosterebilmek

## 7. Login Akisini Nasil Kurduk

Login backend tarafinda su zincirle calisir:

1. request controller'a gelir
2. `LoginDto` validation calisir
3. `AuthService.login()` cagrilir
4. mail veya kullaniciAdi ile aktif kullanici aranir
5. kullanici bulunamazsa `401`
6. sifre hash ile karsilastirilir
7. sifre yanlissa `401`
8. dogruysa token cifti uretilir
9. sade user profiliyle response dondurulur

### 7.1 Login DTO

`apps/api/src/modules/auth/dto/login.dto.ts`

Burada bilerek sadece iki alan vardir:

- `identifier`
- `password`

`identifier` mail de olabilir, kullaniciAdi da olabilir.

Bu secim kullanici deneyimi acisindan iyidir:

- frontend tek alanla login olabilir
- backend bu alani iki farkli alana map eder

### 7.2 Kullanici Bulma

`UsersRepository.findActiveByIdentifier()`

Bu sorgu:

- `silmeTarihi: null` ile aktif kullaniciyi arar
- `mail` veya `kullaniciAdi` uzerinden kontrol eder
- case-insensitive eslesme yapar

Bu sayede:

- soft-deleted hesaplar login olamaz
- mail ve kullaniciAdi ile giris desteklenir
- casing farklari daha az sorun cikarir

### 7.3 Sifre Kontrolu

`bcryptjs.compare()` kullanilir.

Bu su anlama gelir:

- kullanici girdigi sifreyi gonderir
- backend DB'deki `sifreHash` ile karsilastirir
- hash hicbir zaman response'a cikarilmaz

### 7.4 Hata Davranisi

Login'de kullanici bulunamadi ve sifre yanlis senaryolarini ayirmadik.

Ikisi de:

- `401 Unauthorized`
- `Invalid credentials.`

sekline cevrildi.

Bu bilincli secimdir. Cunku:

- saldirgana "mail var ama sifre yanlis" gibi bilgi sızdırmaz
- API davranisi daha tutarli olur

## 8. `me` ve `refresh` Akisini Neden Boyle Biraktik

### `GET /auth/me`

Bu endpoint:

- access token alir
- `JwtStrategy` ile token payload'ini cozer
- `CurrentUser` decorator ile controller'a user bilgisini verir
- sonra `AuthService.getCurrentUser()` DB'den guncel profile bakar

Buradaki guzel taraf:

- sadece token payload'ina koru korune guvenmeyiz
- kullanicinin guncel profili DB'den gelir

### `POST /auth/refresh`

Bu endpoint:

- refresh token'i verify eder
- token tipinin gercekten `refresh` oldugunu kontrol eder
- user hala aktif mi diye bakar
- yeni token cifti dondurur

Bu fazda refresh stateless birakildi.

Yani:

- refresh token table'i yok
- revoke yok
- blacklist yok
- rotation persistence yok

Bu, su anki kapsam icin bilincli bir sadeleştirmedir.

## 9. Veritabani Tarafinda Auth Icin Kurulan Zemin

Prisma schema tarafinda auth icin kritik tablolar:

### `Kullanici`

Temel alanlar:

- `id`
- `ad`
- `soyad`
- `mail`
- `kullaniciAdi`
- `sifreHash`
- `telefonNumarasi`
- `kayitTarihi`
- `silmeTarihi`

Onemli kararlar:

- `mail` unique
- `kullaniciAdi` unique
- soft delete icin `silmeTarihi` var

### `Rol`

Rol sozlugu burada tutulur.

Su an backend tarafinda bekledigimiz temel roller:

- `MUSTERI`
- `NAKLIYECI`
- `ADMIN`

### `KullaniciRol`

Kullanici ile rol arasindaki iliski burada tutulur.

Bu tasarim gelecekte:

- bir kullaniciya birden fazla rol verme
- admin atama
- role genisletme

gibi durumlara alan acar.

## 10. Neden Boyle Bir Backend Mimarisi Sectik

Bu mimariyi secmemizin ana nedenleri:

### 10.1 Erken feature yiginini temizlemek

Ilk asamada yari kalmis veya sinirlari oturmamis feature kodlarini devam ettirmek yerine:

- bootstrap
- auth
- users
- roles

zeminini duzgun kurduk.

Bu geri gidis degildi. Bu, sonraki domain modullerini daha duzgun kurabilmek icin sadeleştirmeydi.

### 10.2 Controller-SERVICE-Repository ayrimi

Bu ayrim sayesinde:

- controller ince kalir
- service mantik tasir
- repository sorgu tasir

Bu cok temel ama ileride cok faydali bir ayrimdir.

### 10.3 Auth'i domain'den once oturtmak

Kullanici kimligi, role atamasi ve JWT zemini olmadan domain modullerine girmek, sonraki adimlarda daha fazla geri donus yaratirdi.

### 10.4 Fazli ilerleme

Bu backend "her seyi ayni anda yap" yaklasimiyla degil, faz faz kuruldu:

- bootstrap
- auth/users/roles
- sonra ilk domain modulu

Bu, karar kalitesini ve okunabilirligi artirir.

## 11. Bu Asamada Bilincli Olarak Yapmadigimiz Seyler

Backend tarafinda bilerek yapmadik:

- logout
- revoke
- refresh blacklist
- device session yonetimi
- email verification
- forgot/reset password
- public users CRUD
- admin user management panel mantigi
- startup auto-seed mutasyonu
- vehicles modulu implementasyonu
- transport-requests implementasyonu
- offers/jobs/ratings/notifications implementasyonu

Bu liste onemli. Cunku backend'in nereye kadar hazir oldugunu dogru anlatmak gerekir.

## 12. Su Anki API'nin Guclu Taraflari

Su an backend'in guclu tarafi su:

- auth akisi gercek
- validation gercek
- DB yazimi gercek
- role atamasi gercek
- token akisi gercek
- error behavior tutarli

Yani bu backend su an "demo fake API" degil. Kucuk ama gercek bir auth backend.

## 13. Su Anki API'nin Sinirlari

Su an backend'in sinirlari su:

- ilk domain akis henuz yok
- register role secse de nakliyeciye ozel domain kaydi henuz yok
- user profile genisletilmedi
- role bootstrap/seed sureci manuel
- refresh persistence yok

Bu sinirlar hata degil; kapsam tercihi.

## 14. Siradaki Backend Adimi Ne Olmali

Bu auth fazindan sonra backend tarafinda en mantikli ilk domain adimi:

## `transport-requests` modulu ile musteri tarafinin ilk gercek is akisni acmak

Neden `transport-requests`:

- auth zemini artik hazir
- musteri rolu artik var
- sistemde ilk gercek ticari hareket "tasima istegi olusturmak"
- `vehicles` modulu nakliyeci tarafinda degerli ama ilk is akis acisiindan ondan once musteri istek acabilmeli

Yani sonraki backend adimi olarak en savunulabilir secim:

- musteri request olustursun
- kendi requestlerini listeleyebilsin
- request detayi gorebilsin

Bu, auth'tan sonra ilk gercek domain halkasidir.

## 15. Siradaki Adimi Nasil Yapacagiz

Burada amac bir anda tum `transport-requests` alanini acmak degil. Ilk backend dilimini kontrollu acmak:

- create request
- my requests list
- request detail

hepsi sadece musteri tarafi icin.

### 15.1 Olusacak veya anlamli sekilde dolacak dosyalar

`apps/api/src/modules/transport-requests/` altinda su yapi kurulabilir:

```text
transport-requests/
├─ dto/
│  ├─ create-transport-request.dto.ts
│  ├─ transport-request-response.dto.ts
│  └─ list-my-transport-requests-query.dto.ts
├─ repositories/
│  └─ transport-requests.repository.ts
├─ transport-requests.controller.ts
├─ transport-requests.service.ts
└─ transport-requests.module.ts
```

### 15.2 Controller seviyesinde ne yapacagiz

`transport-requests.controller.ts`

Burada muhtemel endpointler:

- `POST /api/v1/transport-requests`
- `GET /api/v1/transport-requests/my`
- `GET /api/v1/transport-requests/:id`

Controller gorevi:

- auth guard uygulamak
- role kisiti uygulamak
- DTO almak
- service cagirip response dondurmek

### 15.3 DTO seviyesinde ne yapacagiz

`create-transport-request.dto.ts`

Burada ilk request create alanlari tanimlanir:

- `baslangicSehri`
- `varisSehri`
- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`
- `yukDetay`

Validation:

- bos string kontrolu
- max length kontrolu
- decimal/numeric kontrolu

Bu DTO, request body sozlesmesini netlestirir.

### 15.4 Service seviyesinde ne yapacagiz

`transport-requests.service.ts`

Burasi domain mantiginin ilk merkezi olacak.

Orada yapilacaklar:

- current user rolunu kontrol etmek
- sadece `MUSTERI` icin create izni vermek
- durum kaydini cozumlemek
- repository create/list/detail cagrilarini yapmak
- response DTO'suna cevirme

Bu seviyede bilincli olarak yapilmayacaklar:

- teklif mantigi
- nakliyeci eslestirme
- fiyat hesaplama
- jobs/nakliye olusturma

### 15.5 Repository seviyesinde ne yapacagiz

`transport-requests.repository.ts`

Burada Prisma sorgulari olacak:

- create request
- list my requests
- find request detail by id and owner

DB yaziminda yine su cizgiyi koruyacagiz:

- controller'da Prisma yok
- service'de ham SQL mantigi yok
- repository DB tarafini tasiyor

### 15.6 Role kisitini nasil uygulayacagiz

Bu yeni asamada `RolesGuard` daha anlamli kullanilmaya baslayacak.

Controller seviyesinde:

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles(ROLE_NAMES.MUSTERI)`

kombinasyonu ile musteriye ozel endpointler acilacak.

Bu, mevcut auth altyapisini ilk kez gercek bir domain yetkilendirmesinde kullanmak anlamina gelir.

### 15.7 Response sozlesmesini nasil tutacagiz

Yeni response DTO'sunda sunlar olmasi mantiklidir:

- `id`
- `baslangicSehri`
- `varisSehri`
- `yukDetay`
- `olusturmaTarihi`
- `durum`

Ilk fazda gereksiz buyuk response dondurmek yerine sade tutmak daha dogru olur.

## 16. Neden Once `transport-requests`, Sonra `offers`, Sonra `vehicles`

Burada olasi sira su olabilir:

1. `transport-requests`
2. `offers`
3. `vehicles`
4. `jobs` veya `nakliye` mantigi
5. `ratings`
6. `notifications`

Bu siralama sunun icin mantikli:

- once musteri ihtiyaci ortaya cikar
- sonra nakliyeci teklif verir
- sonra tasima organizasyonu daha somutlasir
- sonra puanlama/notification gibi yan akislar gelir

Alternatif olarak `vehicles` bir adim once de alinabilir. Ama ilk is halkasi acisindan `transport-requests` daha dogal ilk domain adimidir.

## 17. Son Hukum

`apps/api` tarafinda su ana kadar kurdugumuz backend mimarisi, kucuk ama dogru sinirlara sahip bir auth cekirdegi olarak okunmalidir.

Su anki resim:

- bootstrap hazir
- config hazir
- prisma altyapisi hazir
- auth/users/roles zemini hazir
- register/login/me/refresh gercekten calisiyor

Bir sonraki anlamli backend adimi ise auth'tan sonra ilk gercek domain akisini acmaktir.

En mantikli teknik sira:

- `transport-requests` modulu ile musteri request create/list/detail
- sonra `offers`
- sonra daha zengin operasyonel moduller

Yani backend artik "kimlik dogrulayan bir temel" olmaktan cikmis, "ilk domain akisi acilabilecek bir temel" haline gelmistir.
