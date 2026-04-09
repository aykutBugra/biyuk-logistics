# MVC, CRUD ve Bu Projedeki Gercek Karsiligi

Bu dokumanin amaci "Projede MVC kullandik" cumlesini ezberden tekrar etmek degil, o cumlenin bu repoda gercekte neye karsilik geldigini gostermektir.

En net cumle su:

Bu projede klasik MVC'nin tam kopyasi degil, MVC'ye benzeyen katmanli bir NestJS backend yapisi kullaniliyor.

Yani burada:

- tek basina klasik bir `Model-View-Controller` uygulamasi yok
- onun yerine `controller + service + repository + dto + guard + strategy` gibi katmanlara ayrilmis bir backend var
- `View` tarafi ise backend icinde degil, ayri olarak `apps/web` altinda duruyor

Bu ayrim onemlidir. Cunku "MVC kullandik" derken genelde insanlar tek process icinde hem HTML render eden hem model hem controller iceren klasik yapilari dusunur. Bu repoda ise:

- repo yapisi olarak `monorepo`
- backend yapisi olarak `moduler monolith`
- backend ic katmanlari olarak `controller/service/repository`
- UI tarafi olarak ayri `Next.js` uygulamasi

gorunuyor.

Kisaca:

- bu repo saf klasik MVC degil
- ama sorumluluklari ayirmak icin MVC'ye benzeyen bir katmanli backend tasarimi kullaniyor
- bu da erken asamadaki bir urun icin mantikli bir karar

Bu dokuman `apps/api` merkezlidir. `apps/web` yalnizca `View/UI` baglaminda kisa not olarak anilir.

## 0. Terminolojiyi Netlestirelim

Bu repoda birbirine benzeyen ama ayni olmayan kavramlar var:

- `monorepo`: kaynak kodun ayni repo icinde tutulma bicimi
- `moduler monolith`: backend'in tek uygulama olarak calisip iceride modullere ayrilmasi
- `MVC`: sorumluluklari `model`, `view`, `controller` gibi ayirmaya dayanan genel dusunce
- `controller/service/repository`: bu projede kullanilan pratik backend katmanlari

Bu projeye baktiginda su resmi gormen gerekir:

- `apps/api` backend'dir
- `apps/web` frontend'dir
- `apps/api` icinde `auth`, `users`, `roles` gibi moduller vardir
- her modulin icinde de gerekirse `controller`, `service`, `repository`, `dto` gibi alt parcalar vardir

Bu yuzden bu projeyi en dogru anlatan cumle sudur:

"Bu repo MVC mantigini tasiyan ama NestJS'in moduler monolith yapisina gore kurulmus katmanli bir backend kullaniyor."

## 1-mvc neden kullandik alternatifi ne

### Neden bu yapayi sectik?

Bu projede `controller/service/repository` ayrimi secilmesinin temel nedeni kodu daha kolay okumak, buyutmek ve korumaktir.

Bu ayrim sayesinde:

- HTTP istegi alma isi ile is kurali birbirine karismaz
- is kurali ile veritabani sorgusu ayni dosyada yigilmaya baslamaz
- auth gibi cekirdek bir alan temiz bir foundation ile kurulur
- ileride `vehicles`, `offers`, `transport-requests` gibi moduller gercekten dolmaya basladiginda kaos daha gec baslar

Mevcut kod zaten bunu gosteriyor:

- `auth.controller.ts` istek aliyor
- `auth.service.ts` auth mantigini yonetiyor
- `users.repository.ts` ve `roles.repository.ts` Prisma ile veritabani sorgularini yapiyor

Yani tercih edilen sey sadece "dosyalari bolmek" degil, sorumluluklari ayirmak.

### Bu projede bu tercihin somut faydalari

#### 1. HTTP katmani ile is mantigi ayrildi

Ornek:

- `POST /auth/login` endpoint'i controller'da tanimli
- kullaniciyi bulma, sifre kontrolu ve token uretimi service tarafinda

Boylece controller "ne endpoint var?" sorusunu cevapliyor, service ise "bu endpoint ne yapar?" sorusunu.

#### 2. Veritabani mantigi repository'de toplandi

Prisma cagrilari su an agirlikla repository katmaninda:

- `users.repository.ts`
- `roles.repository.ts`

Bu iyi cunku ileride sorgu sekli degisir, select alanlari buyur, transaction artar veya soft delete mantigi eklenirse degisim yeri bellidir.

#### 3. Auth foundation daha savunulabilir kuruldu

Auth erken asamada en kritik alanlardan biridir. Login, register, role kontrolu, JWT verify, refresh akisi gibi konular controller icinde birikseydi cok hizli sekilde okunamaz hale gelirdi.

Mevcut yapi bu riski azaltmis:

- `auth` modulu token ve auth akislarini topluyor
- `users` modulu kullanici kaydi ve okunmasini topluyor
- `roles` modulu yetki tarafini cozmeye yardim ediyor

#### 4. Buyume icin daha temiz zemin olustu

Su an `jobs`, `notifications`, `offers`, `ratings`, `transport-requests`, `vehicles` modulleri bos iskelet olarak bekliyor. Bu bile tek basina sunu gosteriyor:

- ekip kodu "her seyi auth icine ekleyelim" mantigi ile degil
- domain bazli modul sinirlariyla buyutmek istemis

### Alternatifler neydi?

Bu secim zorunlu tek secim degildi. Asagidaki alternatifler vardi.

#### Alternatif 1: Fat controller

Bu modelde controller su islerin cogunu kendi yapar:

- request alma
- validation
- business rule
- DB cagrisi
- response mapleme

Neden secilmedi?

- kucuk projede baslangicta hizli gorunur ama cok cabuk dagilir
- auth gibi alanda controller asiri buyur
- test ve debug zorlasir

Ne zaman mantikli olabilirdi?

- gercekten cok kucuk, tek endpoint'li veya gecici bir servis olsaydi

#### Alternatif 2: Controller + service ama repository'siz yapi

Bu modelde service icinde direkt Prisma kullanilir.

Neden secilmedi?

- baslangicta sade gorunse de service hem is kurali hem sorgu merkezi olur
- query buyudukce service dosyalari sisme egilimine girer
- reuse ve veri erisim kurallarini ayirmak zorlasir

Ne zaman mantikli olabilirdi?

- repository katmani henuz fazla tekrar olusturmuyorsa
- proje cok dar kapsamliyse

Bu projede ise auth ve users tarafi erken ayrildigi icin repository katmani savunulabilir bir karar olmus.

#### Alternatif 3: Clean Architecture veya Hexagonal Architecture

Bu modelde domain, application, infrastructure gibi katmanlar daha kati sekilde ayrilir. Port/adapter mantigi daha belirgin olur.

Neden secilmedi?

- erken asama icin gereksiz agirlik getirebilirdi
- ekipte konuya hakimiyet dusukse teorik olarak temiz, pratikte ise yavaslatan bir yapaya donebilir
- mevcut ihtiyac icin controller/service/repository yeterince temiz bir denge sunuyor

Ne zaman mantikli olabilirdi?

- domain cok buyurse
- ekip buyukse
- test izolasyonu ve framework bagimsizligi ciddi hedef haline gelirse

#### Alternatif 4: Mikroservis

Bu modelde `auth`, `users`, `roles`, `offers` gibi alanlar ayri servisler olur.

Neden secilmedi?

- operasyonel maliyet cok artardi
- bu asamadaki urun icin fazla olurdu
- auth foundation'i ayaga kaldirmadan servislere bolmek erkendi

Ne zaman mantikli olabilirdi?

- takimlar ayri ayri calisiyorsa
- domain'ler gercekten bagimsiz deploy gerektiriyorsa
- trafik ve olcek farkli servislerde ciddi ayrisiyorsa

#### Alternatif 5: Next-only fullstack

Bu modelde backend mantiginin buyuk kismi `apps/web` icinde veya Next route handler'larinda yasardi.

Neden secilmedi?

- bu repoda zaten ayri bir `apps/api` kurulmus
- auth ve business logic'i UI tarafina cok yakinlastirmak istenmemis
- ileride farkli client eklenirse ayri API daha dogal kalir

Ne zaman mantikli olabilirdi?

- urun sadece tek web client olacaksa
- ayri backend hedefi yoksa
- ekip Next fullstack tarafinda daha rahat calisiyorsa

### Son hukum

Bu projede secilen yapi "tek dogru mimari" oldugu icin degil, bugunku olcekte en pragmatik dengeyi verdigi icin mantikli.

Bu denge su:

- klasik MVC kadar anlasilir
- mikroservis kadar pahali degil
- clean architecture kadar agir degil
- fat controller kadar da daginik degil

## 2-mvc projede nasil kullanildi

Bu bolumde teoriyi birakip mevcut koda bakacagiz.

### Uygulamanin genel request akisi

Bu backend'de istek akisinin mantigi kabaca soyledir:

`request -> controller -> dto validation -> service -> repository -> Prisma -> PostgreSQL -> response`

Her adimin karsiligi vardir:

- `controller`: HTTP endpoint'i tanimlar
- `dto`: request body'sini validate eder
- `service`: is kurallarini ve orkestrasyonu yapar
- `repository`: DB sorgularini yapar
- `Prisma`: veritabani adapter'i olarak calisir
- `PostgreSQL`: kalici veri katmanidir

### Uygulama nasil ayaga kalkiyor?

#### `src/main.ts`

Bu dosya backend'in runtime girisidir.

Su an ne yapiyor?

- Nest uygulamasini baslatiyor
- CORS aciyor
- tum endpoint'lere `api/v1` prefix'i veriyor
- global validation pipe aciyor
- port'u okuyup uygulamayi dinlemeye baslatiyor

Bu ne demek?

- `auth.controller.ts` icinde `@Controller("auth")` yazsa bile gercek endpoint `/api/v1/auth/...` oluyor

#### `src/app.module.ts`

Bu dosya ana baglama noktasi.

Su an import edilen aktif parcalar:

- `ConfigModule`
- `PrismaModule`
- `RolesModule`
- `UsersModule`
- `AuthModule`

Buradan su sonucu cikar:

- backend'de gercekten calisan cekirdek moduller `auth`, `users`, `roles`
- bos iskelet moduller henuz ana uygulamaya bagli degil

### Bu projede "Model" neye denk geliyor?

Klasik MVC'de `Model` denince bazen aktif kayit nesneleri akla gelir. Bu projede o kadar klasik bir model katmani yok.

Burada model tarafi daha cok su parcalara dagilmis durumda:

- `apps/api/prisma/schema.prisma`
- Prisma tarafindaki `Kullanici`, `Rol`, `KullaniciRol` gibi tablolar
- DTO ve type tanimlari

Yani "model" tek bir `User.ts` dosyasinda degil; veri yapisinin gercek tanimi schema ve type'lara dagilmis.

### Bu projede "View" neye denk geliyor?

`View` backend icinde degil.

Bu repoda `View/UI` tarafi:

- `apps/web/src/app`
- `apps/web/src/components`

altinda.

Ek not:

- `apps/web/src/lib/api/api-client.ts` Bearer token gonderebilecek sekilde hazir
- ama mevcut taramada `login/page.tsx` ve `register/page.tsx` tarafinin henuz bu client ile tam baglanmadigi gorunuyor

Yani web tarafi su an daha cok arayuz iskeleti, backend ise auth foundation durumunda.

### Katmanlar pratikte nasil kullaniliyor?

#### Controller

Controller endpoint tanimlar.

Ornek aktif controller'lar:

- `src/app.controller.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/roles/roles.controller.ts`

Controller'in gorevi sunlar olmali:

- route tanimlamak
- request'i almak
- gerekli guard/decorator kullanmak
- service'e devretmek

Controller'in gorevi sunlar olmamali:

- sifre hashlemek
- DB transaction yazmak
- uzun is kurali kurmak

#### DTO

DTO request ve response sozlesmesini netlestirir.

Auth tarafinda su DTO'lar var:

- `LoginDto`
- `RegisterDto`
- `RefreshDto`
- `AuthTokenResponseDto`

Users/Roles tarafinda response DTO'lari var:

- `UserProfileResponseDto`
- `RoleResponseDto`

DTO'larin faydasi:

- gelen veriyi kontrol etmek
- controller/service arasi soylesmeyi netlestirmek
- zamanla endpoint yuzeyini daha okunur tutmak

#### Service

Service katmani "asil davranis" katmanidir.

Ornekler:

- `AuthService`: register, login, refresh, current user
- `UsersService`: kullanici okuma/yazma orkestrasyonu
- `RolesService`: rol id bulma, rol isimlerini normalize etme

Service genelde sunu yapar:

- birden fazla repository veya helper kullanir
- business rule calistirir
- hata senaryolarini yonetir
- response'a gidecek veri seklini duzenler

#### Repository

Repository DB ile konusur.

Bu projede gercek Prisma cagrilarinin ana yeri:

- `src/modules/users/repositories/users.repository.ts`
- `src/modules/roles/repositories/roles.repository.ts`

Repository'in faydasi:

- query detayini service'ten ayirmak
- select yapilarini tek yerde tutmak
- transaction mantigini merkezilestirmek

#### Guard

Guard request'in gecip gecemeyecegine karar verir.

Aktif guard'lar:

- `JwtAuthGuard`
- `RolesGuard`

Ornek:

- `GET /auth/me` icin JWT lazim
- `GET /roles/admin-probe` icin hem JWT hem uygun rol lazim

#### Decorator

Decorator request icinden veri cekmeyi veya metadata vermeyi kolaylastirir.

Ornekler:

- `CurrentUser`: `request.user` bilgisini kolay alir
- `Roles`: endpoint icin gerekli rolleri metadata olarak koyar

#### Strategy

Strategy auth'in teknik dogrulama mekanigidir.

Bu projede `JwtStrategy`:

- Bearer token'i header'dan alir
- verify eder
- `AuthenticatedUser` nesnesi olusturur

#### Module

Module Nest tarafinda "hangi controller, hangi provider, hangi import/export var?" sorusunu cozer.

Bu repo icin moduller:

- `AuthModule`
- `UsersModule`
- `RolesModule`
- hazirlik modulleri

### Somut akis 1: Register nasil calisiyor?

Bu akisi anlamak projeyi anlamanin en iyi yoludur.

1. `POST /api/v1/auth/register` istegi gelir.
2. `auth.controller.ts` request'i alir.
3. `RegisterDto` body'yi validate eder.
4. `AuthService.register()` input'u normalize eder.
5. `UsersService.existsByMail()` ve `existsByUsername()` mantigi ile cakisma kontrol edilir.
6. `bcryptjs` ile sifre hashlenir.
7. `RolesService.requireRoleId()` ile rol cozumlur.
8. `UsersRepository.createWithRole()` transaction baslatir.
9. `kullanici` tablosuna kayit atilir.
10. `kullaniciRol` tablosuna rol eslemesi atilir.
11. `AuthService.createTokenPair()` access ve refresh token uretir.
12. response doner.

Bu akis klasik MVC mantigina benzer cunku sorumluluklar ayriktir, ama saf MVC degildir cunku `guard`, `strategy`, `dto`, `repository`, `module` gibi Nest parcalari da vardir.

### Somut akis 2: Login nasil calisiyor?

1. `POST /api/v1/auth/login` istegi gelir.
2. `LoginDto` body'yi validate eder.
3. `AuthService.login()` identifier'i alir.
4. `UsersRepository.findActiveByIdentifier()` kullaniciyi bulur.
5. `compare()` ile sifre kontrol edilir.
6. dogruysa token cifti uretilir.
7. response doner.

Burada kritik nokta:

- login veritabani yazma islemi degildir
- mevcut implementasyonda login sirasinda yeni kayit atilmaz

### Somut akis 3: Roles/me nasil calisiyor?

1. `GET /api/v1/roles/me` istegi gelir.
2. `JwtAuthGuard` token'i zorunlu kilar.
3. `JwtStrategy` token'i parse edip `request.user` olusturur.
4. `CurrentUser` decorator'u user bilgisini controller'a verir.
5. `RolesService.getRolesForUser()` calisir.
6. `RolesRepository.findRoleNamesByUserId()` DB'den rollerin adini ceker.
7. response doner.

Bu da MVC'ye benzeyen ama Nest'e ozgu zenginlesmis bir akis.

### Su an aktif endpoint sayisi kac?

Su an calisan endpoint yuzeyi toplam 7 adettir:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/roles/me`
- `GET /api/v1/roles/admin-probe`

Bu sayi kucuk olabilir ama foundation tarafinda yeterince anlamli bir baslangictir.

## 3-mvc yapisina gore mevcut projedeki tum dosyalar

Bu bolum `apps/api` merkezli rapordur. Dosyalari kategori bazli okuyacagiz. Her dosya icin iki soru cevaplanacak:

- su an ne ise yariyor?
- ileride ne ise yarayacak?

Ek etiketler:

- `aktif`: su an runtime'da gercek karsiligi var
- `hazirlik`: simdilik iskelet veya placeholder

### Bootstrap ve uygulama girisi

#### `apps/api/src/main.ts` `[aktif]`

Su an:

- Nest uygulamasini baslatir
- CORS acilir
- `api/v1` prefix'i eklenir
- global validation pipe acilir
- uygulama dinlemeye alinir

Ileride:

- global exception filter
- logger/interceptor
- swagger
- rate limit

gibi cross-cutting davranislar burada veya buraya bagli yerde genisleyebilir.

#### `apps/api/src/app.module.ts` `[aktif]`

Su an:

- uygulamanin ana modul baglama noktasi
- aktif modulleri import eder

Ileride:

- yeni domain modulleri burada baglanacak
- altyapi modulleri burada merkezi hale getirilecek

#### `apps/api/src/app.controller.ts` `[aktif]`

Su an:

- `GET /health` endpoint'i ile basit saglik cevabi doner

Ileride:

- daha gelismis health/readiness endpoint'ine donebilir
- build/version bilgisi eklenebilir

### Config

#### `apps/api/src/config/app.config.ts` `[aktif]`

Su an:

- port ve CORS origin degerlerini toplar

Ileride:

- uygulama seviyesinde baska config'ler tek yerde tutulabilir

#### `apps/api/src/config/auth.config.ts` `[aktif]`

Su an:

- JWT access secret
- JWT access ttl
- JWT refresh secret
- JWT refresh ttl

degerlerini merkezi toplar

Ileride:

- refresh rotation, cookie ayarlari, auth policy gibi degerler eklenebilir

#### `apps/api/src/config/env.ts` `[aktif]`

Su an:

- `.env` dosyalarinin aranacagi yollari belirler

Ileride:

- farkli environment katmanlari veya daha net env stratejisi icin genisleyebilir

### Infrastructure / Prisma

#### `apps/api/src/infrastructure/prisma/prisma.module.ts` `[aktif]`

Su an:

- `PrismaService`'i global olarak export eder

Ileride:

- tek DB baglantisi yerine observability veya transaction helper katmanlariyla buyuyebilir

#### `apps/api/src/infrastructure/prisma/prisma.service.ts` `[aktif]`

Su an:

- `DATABASE_URL` ile Prisma client olusturur
- module destroy aninda disconnect yapar

Ileride:

- query logging
- metrics
- middleware
- tenant veya transaction policy

gibi DB davranislari burada yogunlasabilir

### Common

#### `apps/api/src/common/.gitkeep` `[hazirlik]`

Su an:

- bos klasorun repoda kalmasini saglar

Ileride:

- common altinda yeni klasorler ciktiginda bu dosya gereksiz kalabilir

#### `apps/api/src/common/constants/role-names.ts` `[aktif]`

Su an:

- rol sabitlerini ve `RoleName` tipini tanimlar

Ileride:

- rol katalogu buyurse merkezi dogruluk kaynagi olmaya devam eder

#### `apps/api/src/common/decorators/current-user.decorator.ts` `[aktif]`

Su an:

- `request.user` bilgisini controller seviyesinde kolay kullanmayi saglar

Ileride:

- controller imzalarini temiz tutmaya devam eder

#### `apps/api/src/common/decorators/roles.decorator.ts` `[aktif]`

Su an:

- gerekli rolleri metadata olarak endpoint'e yazar

Ileride:

- role policy daha karmasik hale gelirse guard ile birlikte daha da degerli olur

#### `apps/api/src/common/guards/jwt-auth.guard.ts` `[aktif]`

Su an:

- JWT strategy'yi guard uzerinden devreye sokar

Ileride:

- protected endpoint sayisi arttikca daha fazla kullanilacak

#### `apps/api/src/common/guards/roles.guard.ts` `[aktif]`

Su an:

- kullanicinin gerekli role sahip olup olmadigini kontrol eder

Ileride:

- sadece `admin-probe` degil, yeni admin/nakliyeci/musteri endpoint'lerinde kullanilacak

#### `apps/api/src/common/types/authenticated-user.type.ts` `[aktif]`

Su an:

- JWT dogrulandiktan sonra request'e tasinan user seklini belirler

Ileride:

- auth yuzeyi buyurse request user kontrati burada genisleyebilir

### Auth modulu

#### `apps/api/src/modules/auth/auth.module.ts` `[aktif]`

Su an:

- auth icin gereken controller, service, strategy ve jwt module wiring'ini kurar

Ileride:

- logout
- password reset
- email verify
- refresh rotation

gibi auth ozellikleri burada baglanir

#### `apps/api/src/modules/auth/auth.controller.ts` `[aktif]`

Su an:

- `register`
- `login`
- `refresh`
- `me`

endpoint'lerini sunar

Ileride:

- auth API yuzeyi genisledikce yeni auth route'lari burada toplanir

#### `apps/api/src/modules/auth/auth.service.ts` `[aktif]`

Su an:

- register akisini orkestre eder
- login akisini orkestre eder
- refresh akisini yurutur
- token cifti uretir
- duplicate kontrolu ve conflict handling yapar

Ileride:

- revoke
- token version
- audit log
- login attempt rate limiting

gibi auth mantiklari burada buyur

#### `apps/api/src/modules/auth/jwt.strategy.ts` `[aktif]`

Su an:

- Bearer token'i header'dan alir
- verify eder
- `AuthenticatedUser` nesnesi olusturur

Ileride:

- payload zenginlesirse veya token politikasi degisirse burada uyarlanir

#### `apps/api/src/modules/auth/dto/login.dto.ts` `[aktif]`

Su an:

- login request body kontratini tanimlar

Ileride:

- login identifier kurali degisirse burasi degisir

#### `apps/api/src/modules/auth/dto/register.dto.ts` `[aktif]`

Su an:

- register request body kontratini tanimlar
- trim, email, min length, role gibi validation'lari yapar

Ileride:

- yeni register alanlari veya farkli role kurallari eklendiginde buyur

#### `apps/api/src/modules/auth/dto/refresh.dto.ts` `[aktif]`

Su an:

- refresh request body'sindeki `refreshToken` alanini kontrol eder

Ileride:

- refresh akisi cookie veya baska model kullanirsa degisebilir

#### `apps/api/src/modules/auth/dto/auth-token-response.dto.ts` `[aktif]`

Su an:

- auth response seklini tanimlar

Ileride:

- token metadata veya session bilgisi eklenirse response kontrati burada buyur

### Users modulu

#### `apps/api/src/modules/users/users.module.ts` `[aktif]`

Su an:

- `UsersService` ve `UsersRepository` saglar
- `RolesModule`'e baglidir
- `AuthModule` icinden kullanilir

Kritik not:

- bu modulin su an controller'i yok
- yani users alaninda service/repository var ama public users endpoint yuzeyi henuz yok

Ileride:

- `users.controller.ts` eklenirse gercek users CRUD burada acilir

#### `apps/api/src/modules/users/users.service.ts` `[aktif]`

Su an:

- active user bulma
- profile bulma
- mail/username var mi kontrolu
- role ile user olusturma
- response mapleme

Ileride:

- update profile
- delete user
- user list
- admin user management

gibi davranislarin ana orkestrasyon katmani olur

#### `apps/api/src/modules/users/dto/user-profile-response.dto.ts` `[aktif]`

Su an:

- kullanici profil response seklini tanimlar

Ileride:

- profil yuzeyi buyurse bu DTO da buyur

#### `apps/api/src/modules/users/repositories/users.repository.ts` `[aktif]`

Su an:

- kullaniciyi identifier ile bulur
- mail var mi diye bakar
- username var mi diye bakar
- transaction ile user + role kaydi olusturur
- id ile active user/profil getirir

Bu dosya su an repository katmaninin en gercek ornegidir.

Ileride:

- update
- soft delete
- pagination
- filter
- audit select'leri

gibi tum users DB mantigi burada buyumelidir

### Roles modulu

#### `apps/api/src/modules/roles/roles.module.ts` `[aktif]`

Su an:

- roles controller/service/repository ve guard'lari baglar

Ileride:

- yetki sistemi buyurse admin role management icin daha aktif hale gelir

#### `apps/api/src/modules/roles/roles.controller.ts` `[aktif]`

Su an:

- `roles/me`
- `roles/admin-probe`

endpoint'lerini sunar

Ileride:

- rol yonetimi veya rol listesi gibi endpoint'ler burada toplanabilir

#### `apps/api/src/modules/roles/roles.service.ts` `[aktif]`

Su an:

- user icin rol listesi doner
- role id gerektiren yerlerde rol cozer
- rol isimlerini normalize eder

Ileride:

- daha guclu yetki mantigi ve rol dogrulama davranislarini tasiyabilir

#### `apps/api/src/modules/roles/dto/role-response.dto.ts` `[aktif]`

Su an:

- role response seklini tanimlar

Ileride:

- yetki response'lari buyurse burada genisler

#### `apps/api/src/modules/roles/repositories/roles.repository.ts` `[aktif]`

Su an:

- rol adina gore rol kaydini bulur
- kullaniciya ait rol isimlerini getirir

Ileride:

- rol yonetimi icin create/update/delete query'leri burada toplanabilir

### Bos iskelet moduller

Bu dosyalarin hepsi su an `hazirlik` seviyesindedir. Sadece `@Module({ imports: [] })` iceren kabuk dosyalardir.

#### `apps/api/src/modules/jobs/jobs.module.ts` `[hazirlik]`

Su an:

- bos modul kabugu

Ileride:

- sistemici is planlama, background job veya is akisi koordinasyonu icin kullanilabilir

#### `apps/api/src/modules/notifications/notifications.module.ts` `[hazirlik]`

Su an:

- bos modul kabugu

Ileride:

- email, sms, app ici bildirim veya event tabanli notification mantigini tasiyabilir

#### `apps/api/src/modules/offers/offers.module.ts` `[hazirlik]`

Su an:

- bos modul kabugu

Ileride:

- nakliye teklifleri domain'ini tasiyabilir

#### `apps/api/src/modules/ratings/ratings.module.ts` `[hazirlik]`

Su an:

- bos modul kabugu

Ileride:

- puanlama ve yorum domain'ini tasiyabilir

#### `apps/api/src/modules/transport-requests/transport-requests.module.ts` `[hazirlik]`

Su an:

- bos modul kabugu

Ileride:

- musteri tarafinin ilk gercek domain modullerinden biri olmaya en yakin adaylardan biridir

#### `apps/api/src/modules/vehicles/vehicles.module.ts` `[hazirlik]`

Su an:

- bos modul kabugu

Ileride:

- nakliyeci arac yonetimi, plaka, kapasite ve arac iliskileri burada ele alinabilir

### Prisma schema

#### `apps/api/prisma/schema.prisma` `[aktif]`

Su an:

- veritabani gerceginin ana kaynagi
- `Kullanici`, `Rol`, `KullaniciRol` dahil tum model tanimlari burada
- `silmeTarihi` gibi gelecekteki soft delete zeminini de simdiden tasiyor

Ileride:

- yeni domain modulleri doldukca schema buyuyecek
- relation'lar, unique constraint'ler ve domain sinirlari burada daha net hale gelecek

### Hangi dosyalar gercekten calisiyor, hangileri hazirlik?

Su an gercekten runtime'da en kritik dosyalar sunlar:

- `main.ts`
- `app.module.ts`
- `prisma.service.ts`
- `auth.controller.ts`
- `auth.service.ts`
- `jwt.strategy.ts`
- `users.service.ts`
- `users.repository.ts`
- `roles.controller.ts`
- `roles.service.ts`
- `roles.repository.ts`

Hazirlik veya placeholder agirlikli dosyalar ise sunlar:

- `common/.gitkeep`
- `jobs.module.ts`
- `notifications.module.ts`
- `offers.module.ts`
- `ratings.module.ts`
- `transport-requests.module.ts`
- `vehicles.module.ts`

Aradaki grup ise destekleyici ama cok onemli dosyalardir:

- config dosyalari
- dto dosyalari
- guard/decorator/type dosyalari

Yani bunlar "is mantigi yazmiyor" olabilir ama uygulamanin duzgun calismasi icin kritik altyapidir.

## 4-crud islemleri ve delete akisi

Bu bolumde bir yanlis anlamayi duzeltmek lazim:

Su an projede tam bir resource CRUD API'si yok.

Yani:

- `users` icin tam `create/read/update/delete` endpoint seti yok
- daha cok `auth foundation` ve `roles okuma` yuzeyi var

Ama veritabani davranisi acisindan baktiginda bazi CRUD parcaciklari mevcut.

### Mevcut durum tablosu

| Islem | Durum | Koddaki karsiligi |
| --- | --- | --- |
| Create | Var ama sinirli | `POST /api/v1/auth/register` kullanici ve rol kaydi olusturur |
| Read | Var | login icin kullanici okuma, `auth/me`, `roles/me`, `health` |
| Update | Yok | `@Put`, `@Patch`, Prisma `.update()` yok |
| Delete | Yok | `@Delete`, Prisma `.delete()` yok |

### Onemli not: Register bir auth komutudur, saf user CRUD degil

Teknik olarak `register` veritabani tarafinda `create` etkisi yapar. Ama mimari olarak bu endpoint'in anlami "auth/register"dir, yani saf "users create" endpoint'i degildir.

Bu ayrim onemlidir:

- bugun sistemde create benzeri davranis var
- ama tam anlamiyla `UsersController` tabanli kaynak CRUD'u henuz kurulmus degil

### Mevcut create/read akislarinin nerede oldugu

#### Create benzeri mevcut akis

- `POST /api/v1/auth/register`
- controller: `auth.controller.ts`
- service orkestrasyonu: `auth.service.ts`
- user yaratma: `users.service.ts`
- DB yazimi: `users.repository.ts`

DB tarafinda ne olur?

- `kullanici` tablosuna satir eklenir
- `kullaniciRol` tablosuna eslesme eklenir

#### Read akislarinin mevcut ornekleri

- login sirasinda kullaniciyi bulma
- refresh sirasinda kullaniciyi id ile bulma
- `GET /api/v1/auth/me`
- `GET /api/v1/roles/me`

Bu read davranislarinin merkezi agirlikla:

- `users.repository.ts`
- `roles.repository.ts`

### Update neden yok?

Su an kod tabaninda:

- `@Put(...)` yok
- `@Patch(...)` yok
- Prisma `.update(...)` yok

Bu da sunu gosterir:

- profil guncelleme
- rol guncelleme
- user edit

gibi akislar henuz baslanmamis.

### Delete neden yok?

Su an kod tabaninda:

- `@Delete(...)` yok
- Prisma `.delete(...)` yok
- `users.controller.ts` diye bir public users controller bile yok

Ama schema tarafinda cok onemli bir ipucu var:

- `Kullanici` modelinde `silmeTarihi` alani var

Bu genelde sunu anlatir:

- sistem ileride hard delete yerine soft delete dusunebilir

### Delete eklenecekse nereye eklenmeli?

En dogru yer `auth` modulu degil, `users` modulu olur.

Cunku:

- `auth` modulu login/register/token gibi kimlik akislarinin evidir
- kullanici silme ise `users` domain sorumlulugudur

Bu yuzden delete ekleme akisinin mantikli yeri sunlar olur:

1. `apps/api/src/modules/users/users.controller.ts` yeni dosya olarak eklenir
2. `apps/api/src/modules/users/users.module.ts` icine controller baglanir
3. `apps/api/src/modules/users/users.service.ts` icine delete orkestrasyonu eklenir
4. `apps/api/src/modules/users/repositories/users.repository.ts` icine DB delete mantigi eklenir

### Ornek ogretici akis: `DELETE /api/v1/users/:id`

Bu kisim mevcut implementasyon degil, tasarlanan ornek akistir.

#### 1. Controller seviyesi

Yeni bir `UsersController` dusunelim.

Ornek davranis:

- route: `DELETE /api/v1/users/:id`
- guard: `JwtAuthGuard`
- tercihen rol korumasi: `RolesGuard`
- ogretici ilk varyant icin `ADMIN` rolu istenebilir

Controller'in gorevi:

- `id` parametresini almak
- service'e devretmek
- basariliysa `204 No Content` donmek

#### 2. Service seviyesi

`UsersService.deleteUser(id: number)` gibi bir metot dusunulebilir.

Bu katmanda yapilacaklar:

- user aktif mi diye kontrol etmek
- bulunamiyorsa `NotFoundException` firlatmak
- yetki kuralini uygulamak
- repository'ye soft delete cagrisi yapmak

Burada business rule tutulur. Ornek:

- sadece admin silebilir
- veya kullanici kendini silebilir
- veya admin baskasini silebilir ama kendini silemez

Bu karar business rule'dur ve service katmaninda durmalidir.

#### 3. Repository seviyesi

`UsersRepository.softDeleteById(id: number)` gibi bir metot eklenir.

DB tarafinda beklenen davranis:

- satiri fiziksel olarak silmek yerine
- `silmeTarihi = now()` yapmak

Bu sayede:

- kayit kaybolmaz
- audit izi kalir
- relation'lar daha kontrollu korunur

#### 4. Mevcut query'ler neden buna uyumlu?

Bu cok guzel bir nokta:

Simdiki `findActive...` sorgulari zaten `silmeTarihi: null` filtreliyor.

Bu ne saglar?

- soft delete yapildiginda login tarafinda o kullanici artik bulunmaz
- `auth/me` veya id ile aktif user bulma akislari o kaydi aktif saymaz
- ek olarak butun sisteme yeni bir filtre mantigi uydurmak zorunda kalmazsin

Yani schema'daki `silmeTarihi` alani bugunden gelecekteki delete stratejisine zemin hazirlamis.

### Neden soft delete daha iyi ilk tercih?

Bu proje icin ilk ogretici ve pratik tercih olarak soft delete daha mantikli gorunuyor.

Neden?

- `silmeTarihi` zaten var
- kullaniciya bagli iliskiler cok olabilir
- audit ve geri donus imkani daha iyidir
- mevcut `findActive...` mantigi ile daha uyumludur

### Hard delete nasil olurdu?

Hard delete daha kaba yaklasim olurdu:

- Prisma tarafinda `.delete(...)` kullanilir
- satir tamamen veritabanindan kaldirilir

Bu ne zaman mantikli olabilir?

- test verisi temizligi
- relation'siz gecici veri
- yasal veya operasyonel olarak fiziksel silme zorunlulugu

Ama bu projede kullanici silme icin ilk tercih olarak hard delete daha risklidir.

### Update eklenecekse mantik benzer olur

Delete anlattik ama ayni model update icin de gecerli olur.

Ornek akis:

1. `users.controller.ts` icine `PATCH /users/:id`
2. `UpdateUserDto`
3. `UsersService.updateUser(...)`
4. `UsersRepository.updateById(...)`
5. Prisma `.update(...)`

Yani genel kural su:

- auth ile ilgili endpoint ise `auth` modulu
- kullanici verisi ile ilgili endpoint ise `users` modulu
- rol verisi ile ilgili endpoint ise `roles` modulu

### Son sonuc

Bugunku backend asagidaki seviyededir:

- auth foundation var
- rol okuma var
- kullanici kaydi ve kullanici okuma var
- ama tam resource CRUD daha kurulmus degil

Bu kotu bir sey degil. Tam tersine, temel auth zemini kurulup sonra domain CRUD'lara gecmek daha kontrollu bir yol olabilir.

En net resim sunudur:

- bugun sistem tam CRUD API degil
- ama dogru modul ve katman sinirlari atilmis
- bu sayede delete/update gibi ozellikler nereye eklenecek sorusunun cevabi simdiden belli

## Kisa Ozet

Bu dokumani tek cumlede ozetlemek gerekirse:

Bu projede klasik MVC'nin aynisi degil, NestJS'in moduler monolith yapisina uygun, MVC mantigi tasiyan controller/service/repository ayrimli bir backend kurulmus durumda.

Bu yapi sayesinde:

- auth mantigi duzenli ilerliyor
- dosyalarin sorumluluklari daha okunur
- yeni domain modulleri icin zemin var
- gelecekte eklenecek update/delete gibi CRUD isleri icin dogru yerlestirme noktasi simdiden belli

Yani asil mesele "MVC etiketi" degil; sorumluluklarin dogru dosyalara dagitilmis olmasi.
