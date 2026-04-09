# JWT, `void` ve Moduler Monolith: Kavramlar ve Bu Projedeki Yeri

Bu dokumanin amaci uc farkli ama projede gercekten karsiligi olan konuyu birlikte anlatmaktir:

1. JWT nedir, nasil calisir, neden kullanilir?
2. TypeScript'te `void` ne demektir, neden vardir, ne zaman anlamlidir?
3. Monolith, moduler monolith ve monorepo ne demektir; bu proje bunlardan hangisidir?

Bu dosya yalnizca teorik bir konu anlatimi degildir. Her baslikta iki katman vardir:

- kavramin genel mantigi
- bu projede neden secildigi, nerede kullanildigi ve secilmeseydi ne olabilecegi

## 1. Once Terminolojiyi Netlestirelim

Bu repoda birkac kavram birbirine cok kolay karisir. O yuzden en basta netlestirmek gerekir:

- Repo duzeyi olarak bu proje bir `monorepo`dur.
- Backend duzeyi olarak `apps/api` bir `moduler monolith` olacak sekilde kurgulanmistir.
- Tum sistem "tek parca fullstack monolith" degildir; cunku `apps/web` ve `apps/api` iki ayri uygulamadir.

Kisaca:

- `monorepo` kaynak kodun nasil organize edildigini anlatir
- `monolith` ya da `moduler monolith` uygulamanin runtime ve deployment yapisini anlatir
- JWT ise auth mekanizmasidir; mimari turu degildir

Bu ayrim onemlidir. Cunku "Bu proje monolith mi?" sorusunun cevabi tek kelimelik degildir:

- repo seviyesinde: monorepo
- backend seviyesinde: moduler monolith
- urun sistemi seviyesinde: ayri frontend + ayri backend

## 2. JWT Nedir?

JWT, "JSON Web Token" ifadesinin kisaltmasidir. Temel olarak server'in istemciye imzali bir token vermesi ve istemcinin sonraki isteklerde bu token'i tasimasidir.

En kaba haliyle JWT su sorunu cozer:

"Bu istegi yapan kullanici kim ve server bunu her istekte nasil anlayacak?"

Klasik JWT bicimi uc parcadan olusur:

```text
header.payload.signature
```

Bu parcalar Base64Url ile kodlanir ve nokta ile birlestirilir.

### 2.1 `header` kismi

Header, token'in hangi algoritma ile imzalandigini ve tipini anlatir.

Ornek mantik:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### 2.2 `payload` kismi

Payload, token icindeki claim denen verileri tasir.

Ornek claim'ler:

- `sub`: kullanici id'si gibi ana kimlik
- `exp`: token son kullanma zamani
- `iat`: olusturulma zamani
- `roles`: kullanicinin rolleri

Onemli not:

JWT payload'i imzalanir ama sifrelenmis olmak zorunda degildir. Yani token'i alan kisi payload'i cozumleyebilir. Bu yuzden JWT icine sifre, hash, kredi karti gibi hassas sirlar konulmaz.

### 2.3 `signature` kismi

Signature, token'in server tarafinda belirli bir secret ile imzalandigini gosterir.

Mantik sudur:

- server header ve payload'i alir
- secret ile imza uretir
- istemci token'i geri gonderdiginde server imzayi yeniden hesaplar
- imza tutuyorsa token'in oynanmadigina karar verir

Bu bize su guvenceyi verir:

- token'in icerigi yolda degistirilmemistir
- token server'in bildigi secret ile uretilmistir

Ama su garantiyi vermez:

- token'in icerigi gizlidir

Yani JWT bir sifreleme formati degil, once bir imzalama/dogrulama mekanizmasidir.

## 3. Stateless Auth ve Access Token / Refresh Token Ayrimi

JWT genelde stateless auth ile birlikte anilir.

`stateless` demek su anlama gelir:

- server her access token'i dogrulamak icin her seferinde session tablosuna bakmak zorunda degildir
- kullanici bilgisi ve token'in gecerliligi imza + claim uzerinden kontrol edilir

Bu projede de ana access kontrolu bu mantikla yapilir.

### 3.1 Access token nedir?

Access token, korumali endpoint'lere girmek icin kullanilan kisa omurlu token'dir.

Genelde:

- omru kisa olur
- her request'te tasinir
- kimlik ve yetki bilgisini tasir

Bu projede access token su islerde kullanilir:

- `GET /api/v1/auth/me`
- `GET /api/v1/roles/me`
- `GET /api/v1/roles/admin-probe`

### 3.2 Refresh token nedir?

Refresh token, access token suresi bittiginde yeni token cifti almak icin kullanilan daha uzun omurlu token'dir.

Genelde:

- access token'dan daha uzun omurludur
- normal business endpoint'lere tasinmaz
- sadece token yenileme akisinda kullanilir

Bu projede refresh token:

- `POST /api/v1/auth/refresh` endpoint'ine body icinde gonderilir
- dogrulanir
- kullanici hala aktifse yeni access ve refresh token uretilir

## 4. JWT'nin Imzalanma ve Dogrulanma Akisi

Kavramsal olarak akisin mantigi sudur:

1. Kullanici login olur.
2. Server kullaniciyi dogrular.
3. Server token uretir.
4. Istemci token'i saklar.
5. Istemci sonraki isteklerde token'i gonderir.
6. Server token'i dogrular.
7. Token gecerliyse istek yetkilendirilir.

Bu projede bu zincirin somut karsiligi vardir.

### 4.1 Token uretimi

`apps/api/src/modules/auth/auth.service.ts` icindeki `createTokenPair()` metodu hem access token hem refresh token uretir.

Access token payload'i sunlari tasir:

- `sub`
- `mail`
- `kullaniciAdi`
- `roles`

Refresh token payload'i ise bilincli olarak daha dar tutulmustur:

- `sub`
- `type: "refresh"`

Bu dar tutma karari iyidir. Cunku refresh token'in gorevi kullanicinin tum profilini tasimak degil, token yenileme akisina anahtar olmaktir.

### 4.2 Secret ve TTL nereden geliyor?

`apps/api/src/config/auth.config.ts` icinde su degerler tanimlidir:

- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_TTL`

Yani token davranisi kodun ortasina dagitilmamis, merkezi config ile yonetilmistir.

Su nokta da onemlidir:

- local development icin fallback degerler var
- production'da guclu secret'lar env ile verilmelidir

### 4.3 Bearer token'in alinmasi ve dogrulanmasi

`apps/api/src/modules/auth/jwt.strategy.ts` dosyasinda `JwtStrategy` sunu yapar:

- token'i `Authorization: Bearer <token>` header'indan ceker
- access secret ile imzayi dogrular
- expiration kontrolu yapar
- payload'i `AuthenticatedUser` tipine map eder

Buradaki kritik satir mantigi sudur:

- `ExtractJwt.fromAuthHeaderAsBearerToken()`
- `ignoreExpiration: false`

Yani bu strategy:

- token'in Bearer header ile gelmesini bekler
- suresi dolmus token'i kabul etmez

### 4.4 Guard ne yapiyor?

`apps/api/src/common/guards/jwt-auth.guard.ts` icindeki `JwtAuthGuard`, `AuthGuard("jwt")` uzerinden Passport stratejisini devreye sokar.

Pratikte bu su demektir:

- endpoint `@UseGuards(JwtAuthGuard)` ile korunur
- request gelince once JWT kontrolu yapilir
- token gecerliyse `request.user` olusur
- sonra controller calisir

Bu user nesnesi daha sonra `CurrentUser` decorator'u ile controller'a tasinabilir.

### 4.5 Roller nasil devreye giriyor?

Access token payload'inda `roles` alani vardir. `JwtStrategy.validate()` bu rolleri `AuthenticatedUser` nesnesine koyar.

Ardindan `RolesGuard` bunu kullanarak role kontrolu yapabilir.

Bu sayede auth zinciri soyle olur:

1. token gecerli mi?
2. kullanici kim?
3. bu kullanici gerekli role sahip mi?

Yani JWT bu projede yalnizca "kimlik var mi" sorusunu degil, temel yetki zemininin ilk katmanini da tasir.

## 5. Bu Projede JWT Tam Olarak Nerede Kullaniliyor?

JWT kullanimi soyut bir karar degil; kodda cok net izleri var.

### 5.1 Backend tarafi

`apps/api/src/modules/auth/auth.module.ts`

- `PassportModule` default strategy olarak `jwt` ile kayit edilir
- `JwtModule.registerAsync(...)` ile JWT servisinin temel ayarlari yuklenir

`apps/api/src/modules/auth/auth.service.ts`

- register sonrasi token cifti uretilir
- login sonrasi token cifti uretilir
- refresh endpoint'inde refresh token verify edilir

`apps/api/src/modules/auth/jwt.strategy.ts`

- access token okunur
- verify edilir
- `AuthenticatedUser` uretilir

`apps/api/src/common/guards/jwt-auth.guard.ts`

- protected endpoint girisinde JWT dogrulamasi calistirilir

`apps/api/src/modules/auth/auth.controller.ts`

- `GET /auth/me` JWT guard ile korunur

`apps/api/src/modules/roles/roles.controller.ts`

- `GET /roles/me` ve `GET /roles/admin-probe` korumali akis uzerinden gider

### 5.2 Web tarafi

`apps/web/src/lib/api/api-client.ts`

Bu dosya, `accessToken` verilirse istek header'ina su alani ekleyebilecek sekilde hazirlanmistir:

```text
Authorization: Bearer <accessToken>
```

Bu cok onemli bir ipucudur. Cunku repo sadece backend'de JWT kullanmiyor; frontend API istemcisi de Bearer token tasima modeline gore dusunulmus.

Bugun icin web tarafinda tam auth state akisi tamamlanmis degil, ama teknik sozlesme belirlenmis durumda:

- backend Bearer bekliyor
- web API client Bearer gonderebiliyor

## 6. JWT'nin Guvenlik Sinirlari


JWT faydali bir aractir ama sihirli degildir.

Asagidaki noktalar mutlaka dogru anlasilmalidir:

### 6.1 JWT sifreleme degildir

Token'i ele geciren biri payload'i okuyabilir. Bu yuzden payload minimum tutulmalidir.

Bu projede bunun kismen uygulandigini goruyoruz:

- access token sadece auth icin gerekli alanlari tasiyor
- refresh token daha da dar tutuluyor

### 6.2 Token sizarsa risk vardir

Bir access token veya refresh token baska birinin eline gecerse, suresi dolana kadar kullanilabilir.

Ozellikle refresh token sizmasi daha kritik olabilir. Cunku yeni access token uretebilir.

### 6.3 Logout ve revoke JWT'de daha zordur

Stateless modelin bedeli buradadir:

- token verildikten sonra onu aninda geri cekmek zordur
- bunu yapmak icin blacklist, rotation, session store veya versioning gibi ek mekanizmalar gerekir

### 6.4 Refresh akisinin stateless olmasi sadedir ama sinirlidir

Bu projede refresh token su an stateless tutulmustur. Bu sade ve hizli bir ilk asama cozumudur.

Ama bunun sinirlari vardir:

- refresh token sunucu tarafinda tutulmadigi icin anlik revoke zorlasir
- cihaz bazli session yonetimi yapilamaz
- "tek cikis yap" veya "bu cihazdan cikis yap" gibi akislari kurmak zorlasir

Yani bugunku secim yanlis degil; ama tradeoff icerir.

## 7. Peki JWT Kullanilmasa da Olur muydu?

Kisa cevap: Evet, olurdu.

Daha dogru cevap: Evet, ama farkli maliyetlerle ve farkli avantaj/dezavantaj dengesiyle olurdu.

JWT zorunlu bir din degil, teknik bir tercihtir. Bu projede makul bir tercih olmasinin nedeni vardir; ama tek dogru cozum degildir.

### 7.1 Alternatif 1: Cookie + Server-Side Session

Bu modelde:

- istemciye rastgele bir session id verilir
- asil oturum bilgisi server tarafinda tutulur
- browser genelde bunu cookie ile tasir

Avantajlari:

- revoke kolaydir
- logout daha nettir
- session kaydini sunucudan silmek yeterlidir
- refresh token mantigi bazen daha basit hale getirilebilir

Eksileri:

- session store gerekir
- yatay olceklenmede Redis veya DB tabanli oturum yonetimi gerekir
- API ve istemci ayriksa cookie, same-site, CORS, CSRF gibi konular dikkat ister

Bu proje icin olur muydu?

Evet, ozellikle sadece browser odakli bir sistem olarak kalsaydi olurdu. Hatta bazi ekipler bu modeli JWT'den daha guvenli ve kontrol edilebilir bulur.

Ama bu projede ayrik `web` ve `api` uygulamasi kuruldugu icin Bearer token tabanli bir sozlesme daha dogrudan bir secim olmus.

### 7.2 Alternatif 2: Opaque Token

Bu modelde istemci yine bir token tasir ama token'in anlami server tarafinda session store veya DB'de cozulur.

Avantajlari:

- istemci tarafindaki token anlamsizdir
- revoke daha kolaydir
- token icerigi tasinmaz, referans tasinir

Eksileri:

- her dogrulamada server tarafli storage bakisi gerekir
- stateless avantaj kaybolur

Bu proje icin olur muydu?

Evet. Ozellikle session yonetimi, cihaz bazli kontrol ve anlik revoke ihtiyaci artarsa gayet mantikli hale gelebilir.

### 7.3 Alternatif 3: Dis Kimlik Servisi

Auth0, Keycloak, Cognito veya benzeri bir identity provider kullanilabilirdi.

Avantajlari:

- sifre ve session yonetimi kismen disari verilir
- enterprise auth ozellikleri hizli gelir

Eksileri:

- operasyonel ve urunsel bagimlilik yaratir
- bu asamada gereksiz karmasiklik olabilir

### 7.4 Neden bu projede JWT makul bir secim?

Bu projede JWT'nin secilmesini savunulabilir kilan birkac somut neden vardir:

1. `apps/web` ve `apps/api` ayri uygulama sinirlarina sahiptir.
2. Backend tarafinda Nest + Passport guard zinciri JWT ile cok dogal calisir.
3. Bearer token tabanli REST sozlesmesi frontend ile backend arasinda sadedir.
4. Session store kurmadan ilk auth foundation'ini hizli kurmayi saglar.
5. Ileride mobil istemci veya farkli bir client gelirse Bearer modeli yeniden kullanilabilir.

Yani JWT burada "moda oldugu icin" degil, ayrik frontend/backend kurgusuna uydugu icin secilmistir.

### 7.5 JWT'nin bu proje icin eksileri neler?

Bu projede JWT secimi makul ama bedelsiz degil:

- stateless refresh modeli revoke islerini zorlastirir
- logout akisi bugun icin guclu degildir
- token sizmasi durumunda risk vardir
- access payload'ina fazla veri koyarsaniz token buyur ve gereksiz veri tasir
- production'da secret yonetimi ve token saklama stratejisi kritik hale gelir

O yuzden en dogru cumle sunudur:

"Bu projede JWT kullanmak mantiklidir, ama sonsuza kadar degismeyecek kutsal bir karar degildir."

Ihtiyac buyurse:

- refresh rotation
- token blacklist
- device session kaydi
- opaque token
- veya tam server-side session

gibi modellere gecilebilir.

## 8. TypeScript'te `void` Nedir?

`void`, TypeScript'te "bu fonksiyonun anlamli bir donus degeri yok" demenin tip seviyesindeki yoludur.

Ornek:

```ts
function logMessage(message: string): void {
  console.log(message);
}
```

Bu fonksiyon teknik olarak JavaScript'te `undefined` ile sonlanir. Ama burada asil vurgulanan sey sudur:

- bu fonksiyonun amaci bir veri uretmek degil
- yan etki yapmaktir

Yani `void`, sadece "hicbir sey yok" degil, "burada anlamli bir sonuc bekleme" mesajidir.

## 9. `void`, `undefined` ve `never` Farki

Bu uc kavram sik karisir.

### 9.1 `void`

Bir fonksiyonun kullaniciya anlamli bir deger donmedigini anlatir.

Odak:

- niyet
- API semantigi

### 9.2 `undefined`

JavaScript'teki gercek bir degerdir.

Yani:

- `undefined` runtime value'dur
- `void` ise daha cok tipsel ve anlamsal bir ifadedir

### 9.3 `never`

Bir fonksiyonun normal sekilde hic donmeyecegini anlatir.

Ornek:

- her zaman `throw` eden fonksiyon
- sonsuz donguye giren fonksiyon

Ornek:

```ts
function fail(message: string): never {
  throw new Error(message);
}
```

Bu fonksiyonun "donus degeri yok" demek bile eksik olur; cunku fonksiyon zaten normal akisla bitmez.

## 10. `Promise<void>` Ne Demektir?

Async fonksiyonlar genelde `Promise<T>` doner.

Eger async fonksiyonun basarili oldugunda anlamli bir veri donmesi gerekmiyorsa tip:

```ts
Promise<void>
```

olur.

Bu su anlama gelir:

- fonksiyon async'tir
- tamamlanmasi onemlidir
- ama sonuc verisi beklenmez

Yani soru su olmaz:

- "fonksiyon ne dondurdu?"

Soru su olur:

- "fonksiyon basariyla tamamlandi mi, hata firlatti mi?"

## 11. `void expression` Operatore Nedir?

JavaScript'te `void` yalnizca tip olarak kullanilmaz; operator olarak da kullanilir.

Ornek:

```ts
void someAsyncCall();
```

Burada `void` operatoru ifadenin sonucunu `undefined` yapar.

Pratik anlami ise cogu zaman sudur:

- bu cagriyi bilincli olarak baslatiyorum
- donen degeri kullanmiyorum

Ozellikle `Promise` donduren bir ifadede bu yazim "fire-and-forget niyeti" gosterebilir.

## 12. Bu Projede `void` Nerede ve Neden Kullaniliyor?

Bu repoda `void` cok fazla yerde degil, az ama anlamli yerde gorunuyor. Bu iyi bir seydir. Cunku `void` her yerde degil, ihtiyac oldugu yerde kullanilmistir.

### 12.1 `void bootstrap()`

`apps/api/src/main.ts` dosyasinin sonunda su ifade vardir:

```ts
void bootstrap();
```

`bootstrap()` async bir fonksiyondur. Yani `Promise` doner.

Burada `void` kullanilmasinin anlami sunlardir:

- uygulama bootstrap islemi baslatiliyor
- bu en ust seviyede beklenmiyor
- donen `Promise` bilincli olarak okunmuyor

Bu yazim, plain `bootstrap();` cagrisi yerine daha niyetlidir. Sunu soyler:

"Evet, bu bir `Promise` donuyor; ben bunu yanlislikla unutmus degilim, bilincli olarak beklemiyorum."

### 12.2 `Promise<void>`

`apps/api/src/modules/auth/auth.service.ts` icindeki `assertRegistrationIdentifiersAvailable(...)` metodu su tiptedir:

```ts
Promise<void>
```

Bu cok anlamli bir secimdir. Cunku bu metodun gorevi veri dondurmek degil, kontrol yapmaktir.

Metot:

- mail dolu mu diye bakar
- kullanici adi dolu mu diye bakar
- cakisma varsa exception firlatir
- sorun yoksa sessizce biter

Yani bu metodun API anlami sunu soyler:

"Sana sonuc nesnesi vermeyecegim. Ya basariyla gececegim ya da hata verecegim."

### 12.3 `never | void`

Ayni dosyada `rethrowUniqueConstraintAsConflict(error)` metodu su sekilde tiplenmistir:

```ts
never | void
```

Bu tip, metodun iki olasi davranisini cok net anlatir:

- ya hicbir sey yapmaz ve devam eder (`void`)
- ya da exception firlatip akisi kirar (`never`)

Bu, ozellikle kontrol akisina bakan bir gelistirici icin degerli bir ipucudur.

Bu tip sayesinde metodun anlami daha net okunur:

- eger hata bizim ilgilendigimiz unique constraint hatasiysa exception firlat
- degilse sessizce geri don

## 13. Peki `void` Kullanilmasa da Olur muydu?

Kisa cevap: Cogu yerde evet, ama daha kotu ifade edilmis olurdu.

### 13.1 `void bootstrap()` yerine ne olabilirdi?

Sunlar yazilabilirdi:

```ts
bootstrap();
```

veya

```ts
bootstrap().catch((error) => {
  console.error(error);
});
```

Ilk yazim daha belirsizdir. Cunku promise'in kazara mi unutuldugu, yoksa bilincli mi ignore edildigi hemen anlasilmaz.

Ikinci yazim ise hata yonetimi acisindan daha guclu olabilir. Yani teknik olarak "daha iyi bir varyant" bile olabilir.

Ama mevcut `void bootstrap();` yazimi yine de su niyeti net verir:

- en ust seviyede async bootstrap tetikleniyor
- donen deger kullanilmiyor

### 13.2 `Promise<void>` yazilmasa olur muydu?

TypeScript bazen bunu infer edebilirdi. Ama acik yazmak su faydayi verir:

- metodun veri dondurmedigi hemen anlasilir
- bu metodun amaci bir yan etki veya kontrol akisi oldugu gorulur

### 13.3 `never | void` yazilmasa olur muydu?

Evet. Kod yine calisirdi.

Ama mevcut tip, metodu okuyan kisiye cok degerli bir niyet bildirimi yapar:

- bazen akisi kirar
- bazen sessizce gecilir

Ozellikle hata isleme helper'larinda bu tip acikligi faydalidir.

O yuzden su sonuc dogrudur:

`void` burada zorunlu oldugu icin degil, okunabilirligi ve niyeti guclendirdigi icin degerlidir.

## 14. Monolith Nedir?

Monolith en temel anlamiyla tek uygulama olarak deploy edilen, tek process veya tek deployment birimi gibi dusunulen sistemdir.

Monolith denince cogu zaman su ozellikler akla gelir:

- tek kod tabani ya da tek backend uygulamasi
- moduller ayni runtime icinde calisir
- servisler network yerine process ici cagrilarla haberlesir

Monolith kotu bir kelime degildir. Sadece bir mimari turudur.

Kotu olan sey genelde "duzensiz monolith"tir; monolith olmasi degil.

## 15. Moduler Monolith Nedir?

Moduler monolith, tek uygulama olma ozelligini korurken iceride sinirlari net moduller kuran mimaridir.

Yani:

- deployment birimi tektir
- ama kod sorumsuzca birbirine karismaz
- moduller domain veya sorumluluk bazli ayrilir

Bu projedeki backend tam olarak bu yone kurulmustur.

`apps/api` icinde su ayri alanlar vardir:

- `auth`
- `users`
- `roles`
- ileride doldurulacak domain modulleri: `vehicles`, `transport-requests`, `offers`, `jobs`, `ratings`, `notifications`

Ek olarak katmanlar da ayridir:

- controller
- service
- repository
- dto
- guard
- common

Bu, "tek uygulama ama duzgun sinirlar" modelidir. Yani moduler monolith tam da budur.

## 16. Monorepo ile Farki Nedir?

Burasi en cok karistirilan noktadir.

`monorepo` bir deployment tipi degil, kaynak kod organizasyonudur.

Bu proje monorepodur cunku kokte su workspaces vardir:

- `apps/web`
- `apps/api`

Ama bu bilgi bize sistemin runtime'ini tek basina anlatmaz.

Ornek:

- bir monorepo icinde mikroservisler olabilir
- bir monorepo icinde bir frontend + bir backend olabilir
- bir monorepo icinde tek uygulama da olabilir

Yani monorepo "kod nerede duruyor?" sorusunu cevaplar.

Monolith ise daha cok "uygulama nasil calisiyor ve deploy ediliyor?" sorusunu cevaplar.

Bu repo icin dogru cumle sunudur:

- repo yapisi: monorepo
- backend yapisi: moduler monolith

## 17. Mikroservis ile Farki Nedir?

Mikroservis mimarisinde domain sinirlari ayri deploy edilen servisler olarak tasinir.

Genelde su ozellikler vardir:

- ayri servisler
- ayri deployment'lar
- servisler arasi network ile iletisim
- bazen ayri veritabani sahipligi

Avantajlari olabilir:

- bagimsiz deploy
- takim bazli sahiplik
- belli alanlarda bagimsiz olcekleme

Ama ciddi maliyetleri de vardir:

- operasyon karmasikligi
- log, tracing, monitoring ihtiyaci
- servisler arasi hata ve timeout sorunlari
- lokal gelistirme karmasikligi

Erken asamadaki bir urunde mikroservis cogu zaman teknik ihtiyactan cok operasyon yukune donusebilir.

## 18. Bu Projede Neden Moduler Monolith Tercih Edildi?

Bu projede backend tarafinda moduler monolith secimi savunulabilir ve tutarlidir.

### 18.1 Tek backend process yeterli

Su an icin auth, users, roles ve ileride gelecek tasima domain'leri ayni backend uygulamasi icinde rahatlikla tasinabilir.

Bunlari erken asamada ayri servislere bolmek fazla maliyet uretirdi.

### 18.2 Modul sinirlari zaten gerekli

Her seyi tek `service.ts` veya controller yiginina koymak yerine domain bazli sinirlar kurulmus:

- auth giris ve token akislarini yonetir
- users kullanici okuma/yazma mantigini tasir
- roles yetki tarafini cozer

Bu ayrim, mikroservise gitmeden de duzgun mimari kurulabilecegini gosterir.

### 18.3 Operasyon maliyeti dusuktur

Tek API uygulamasi:

- lokal gelistirmeyi kolaylastirir
- deployment'i basit tutar
- debug etmeyi kolaylastirir
- tek auth zemini kurmayi kolaylastirir

### 18.4 Erken asama urun icin yeterince sade

Projede once auth/users/roles foundation kurulmus. Bu zaten erken asama icin dogru bir stratejidir.

Bu asamada en onemli sey:

- hizli ama duzensiz buyumek degil
- kontrollu ama gereksiz operasyon yukune girmeden buyumektir

Moduler monolith bu noktada iyi bir denge verir.

## 19. Baska Turlu Olur muydu?

Evet, olurdu. Ama her alternatif farkli bir bedel getirirdi.

### 19.1 Next-only fullstack

Yani business logic'in buyuk kisminin Next tarafinda tutulmasi.

Neden secilmedi?

- ayri backend hedefiyle celisir
- auth, validation ve is kurallari UI katmanina fazla yaklasir
- ileride farkli client'lara acilmayi zorlastirir

### 19.2 Ayri repo + ayri backend

Neden secilmedi?

- bugunku olcekte entegrasyon takip maliyetini artirir
- frontend ve backend'i ayni urun baglaminda birlikte gelistirmeyi zorlastirir

Bu secenek kotu degildir; ama su asamada monorepo daha pratiktir.

### 19.3 Mikroservis

Neden secilmedi?

- erken asamada fazla operasyon maliyeti getirir
- auth, users, roles gibi cekirdek alanlar henuz buyuk organizasyonel ayrisma gerektirmez
- once domain'in gercekten nereye buyudugu gorulmelidir

Dogru zaman gelirse mikroservise gecis dusunulebilir. Ama mikroservis "iyi mimari" ile es anlamli degildir.

## 20. Kisa Sonuc

Bu projedeki teknik resim su sekilde okunmalidir:

- repo `monorepo` olarak organize edilmistir
- backend `moduler monolith` olarak kurgulanmistir
- auth tarafinda JWT tabanli Bearer token modeli secilmistir
- TypeScript tarafinda `void`, niyeti ve kontrol akislarini daha okunur yapmak icin sinirli ama anlamli yerde kullanilmistir

Uc konu da ayni ortak mantiga baglanir:

- kavramlar modaya gore degil, sinir ve niyet netligi icin secilmis
- hicbiri mutlak dogma degil
- ihtiyac degisirse tercih de degisebilir

En savunulabilir teknik cumle sudur:

"Bu projede secilen JWT, `void` ve moduler monolith tercihleri zorunlu tek cozum olduklari icin degil; mevcut urun asamasinda okunabilirlik, sadelik ve kontrollu buyume dengesini iyi verdikleri icin mantiklidir."

## 21. Hizli Karsilastirma Tablosu

| Kavram | Projedeki kullanim | Alternatif var mi? | Neden mevcut tercih mantikli? |
| --- | --- | --- | --- |
| JWT | `apps/api` auth akisi, Bearer token dogrulamasi, refresh mekanizmasi | Evet: session cookie, opaque token, dis kimlik servisi | Ayri `web` ve `api` yapisinda sade REST auth sozlesmesi sunuyor |
| `void` | `void bootstrap()`, `Promise<void>`, `never \| void` | Evet: inference veya farkli yazimlarla | Kodun niyetini ve kontrol akislarini daha okunur yapiyor |
| Monorepo | Kokte `apps/web` + `apps/api` workspaces | Evet: ayri repolar | Urunun iki uygulamasini ayni baglamda yonetmeyi kolaylastiriyor |
| Moduler monolith | `apps/api` icinde tek backend process ama net moduller | Evet: mikroservis veya duzensiz tek katmanli backend | Dusuk operasyon maliyetiyle net sinirlar veriyor |
