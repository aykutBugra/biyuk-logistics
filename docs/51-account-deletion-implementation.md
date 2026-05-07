# Account Deletion Implementation

## Amac

Authenticated kullanicinin `Profilim` ekranindan kendi hesabini guvenli sekilde silebilmesini saglamak.

Bu akis:

- kullaniciyi sistemden cikarir
- auth ve workspace state'ini temizler
- kullaniciya bagli soft-delete uyumlu kayitlari kaldirir
- aktif operasyon varsa silmeyi bloke eder
- orphan veri, broken foreign key ve partial commit riskini engeller

## Urun Karari

- Self-service endpoint olarak `DELETE /auth/me` secildi.
- Hesap silme stratejisi mevcut repo semantigine uygun sekilde `soft delete + identifier anonymization` olarak uygulandi.
- `Kullanici`, `Arac`, `CarrierRoute`, `Istek` kayitlari soft delete edilir.
- `mail` ve `kullaniciAdi` anonimlestirilir; ayni bilgiler yeni test hesabinda tekrar kullanilabilir.
- Tarihsel butunluk gerektiren `Teklif`, `OfferThread`, `OfferThreadMessage`, `Nakliye`, `Puanlama`, `Bildirim`, `KullaniciRol` kayitlari korunur.

## Secilen Silme Stratejisi

- Kullanici satiri fiziksel olarak silinmez; `silmeTarihi` set edilir.
- Kimlik alanlari su sekilde anonimlestirilir:
  - `mail -> deleted-<userId>-<timestamp>@deleted.local`
  - `kullaniciAdi -> deleted-<userId>-<timestamp>`
  - `telefonNumarasi -> null`
- Iliskili aktif `Arac`, `CarrierRoute` ve `Istek` kayitlari ayni transaction icinde `silmeTarihi` ile kapatilir.
- Mutasyonlar tek Prisma transaction icinde calisir; herhangi bir adim hata verirse tum pipeline rollback olur.

## Hesap Silme Akisi

1. `DELETE /auth/me` JWT ile korunur.
2. `JwtStrategy` artik sadece token payload'ina guvenmez; aktif kullaniciyi DB'den tekrar okur.
3. `UsersRepository.deleteAccountById()` once deletion snapshot toplar.
4. Snapshot aktif operasyon veya drift riski gosteriyorsa islem `409 Conflict` ile kesilir.
5. Blok yoksa ayni transaction icinde:
   - araclar soft delete
   - carrier route'lar soft delete
   - request'ler soft delete
   - kullanici soft delete + anonymization
6. Frontend basarida:
   - `clearStoredAuth()` cagirir
   - workspace storage'i temizler
   - `/login?accountDeleted=1` sayfasina yonlendirir
7. Login ekraninda basari banner'i gosterilir.

## Aktif Operasyon Varken Neden Bloklaniyor

Silme su durumlarda sistem drift'i yaratabilecegi icin bloke edilir:

- kullanici tasiyici olarak tamamlanmamis `Nakliye` tasiyorsa
- kullanici musteri olarak tamamlanmamis `Nakliye` bagli bir `Istek` tasiyorsa
- kullanici tasiyici olarak halen aktif bir `Teklif` tasiyorsa
- kabul edilmis teklif veya `ANLASILDI` request kapanis akisi yarim kalmis gorunuyorsa

Bu karar, devam eden operasyonlarin yarida kesilmesini ve sonradan karar/okuma ekranlarinda bozuk state olusmasini engeller.

## Temizlenen / Korunan Veri Turleri

Temizlenen veya soft delete edilen:

- `Kullanici`
- `Arac`
- `CarrierRoute`
- `Istek`
- local auth storage
- dashboard workspace storage

Korunan:

- `Teklif`
- `OfferThread`
- `OfferThreadMessage`
- `Nakliye`
- `Puanlama`
- `Bildirim`
- `KullaniciRol`

Korunan kayitlar FK ve audit butunlugu icin yerinde kalir. Silinmis kullanicilarin tarihsel kayitlari canli iliski uzerinden okunmaya devam eder; bu nedenle bazi tarihsel ekranlarda anonimlestirilmis `kullaniciAdi` gorulebilir.

## Backend Degisiklikleri

- `DELETE /auth/me` endpoint'i eklendi.
- `AuthService.deleteCurrentUser()` eklendi.
- `UsersService.deleteOwnAccount()` block reason'lari HTTP hatalarina map eder hale geldi.
- `UsersRepository.deleteAccountById()` deletion snapshot + transaction pipeline'i ekledi.
- `JwtStrategy.validate()` async hale getirildi ve aktif kullaniciyi DB'den okuyacak sekilde sertlestirildi.

Sonuc olarak:

- silinmis hesap `login` ile tekrar giris yapamaz
- silinmis hesap `refresh` ile token yenileyemez
- silinmis hesap mevcut access token suresi dolmamis olsa bile korumali endpointlerden `401` alir

## Frontend Degisiklikleri

- `Profilim` ekranina ayri bir `Danger zone` bolumu eklendi.
- `window.confirm` yerine iki asamali confirm panel kullanildi.
- Hata durumunda `409` mesajlari inline error box ile gosterilir.
- Basarida auth temizlenir ve login ekranina yonlendirilir.
- Login ekranina `accountDeleted=1` query param'i ile gelen basari banner'i eklendi.
- Yeni web helper:
  - `apps/web/src/lib/api/auth.ts`
  - `deleteMyAccount(accessToken)`

## Test ve Dogrulama

Eklenen testler:

- `apps/api/test/users.account-deletion.spec.ts`
  - guvenli hesap soft delete + anonymization
  - aktif shipment blokaji
  - aktif offer blokaji
  - transaction rollback davranisi
  - service exception mapping
- `apps/api/test/auth.account-deletion.spec.ts`
  - deleted/inactive user login reddi
  - `AuthService.deleteCurrentUser()` delegasyonu
  - `JwtStrategy` aktif kullanici dogrulamasi
  - deleted user icin `401`

Calistirilan dogrulamalar:

- `npm run test:api`
- `npm run lint:api`
- `npm run lint:web`
- `npm run build:api`
- `npm run build:web`

## Bilinen Sinirlamalar

- Bu turda server-side refresh token revoke store eklenmedi; mevcut refresh akisi stateless kalmaya devam ediyor. Ancak silinmis kullanici `findActiveById` kontrolu nedeniyle refresh alamiyor.
- Tarihsel ekranlar bazi yerlerde kullaniciyi canli iliski uzerinden okudugu icin silinmis hesaplar anonimlestirilmis kimlik bilgisiyle gorunebilir.
- `Teklif` ve `OfferThread` kayitlari audit amaciyla korunur; bu nedenle eski mesajlasma baglami fiziksel olarak silinmez, sadece hesap operasyonel olarak kapanir.
