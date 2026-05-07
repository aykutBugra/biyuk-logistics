# Role Onboarding + Unified Registration Implementation

## Ozet

Bu fazda kayit ve role genisletme akislari tek hesap mantigina gore duzenlendi.

- `MUSTERI` kaydi yalniz customer hesap acar.
- `NAKLIYECI` kaydi artik `MUSTERI + NAKLIYECI` dual-role hesap acar.
- Mevcut customer kullanici ikinci kez register olmak yerine `Profilim` uzerinden ilk arac onboarding'i ile carrier role ekler.
- Ilk arac basariyla olusmadan `NAKLIYECI` rolu verilmez.

## Backend

- `POST /auth/register` akisi guncellendi.
  - Her yeni hesap once `MUSTERI` olarak olusuyor.
  - Carrier register secildiginde ayni transaction icinde ilk arac olusturuluyor.
  - Ilk arac olusursa ayni transaction icinde `NAKLIYECI` rolu ataniyor.
  - Herhangi bir adim fail olursa tum kayit rollback oluyor.

- Yeni endpoint eklendi:
  - `POST /auth/me/carrier-onboarding`
  - Authenticated mevcut customer kullanicidan ilk arac bilgisini aliyor.
  - Arac + role grant ayni transaction icinde tamamlanıyor.
  - Basari durumunda yeni token cifti ve guncel `user` payload'i donuyor.

- `POST /roles/me/business-role` self-serve carrier bypass yolu olmaktan cikarildi.
  - `NAKLIYECI` bu endpoint'ten eklenemiyor.
  - Carrier role yalniz profile onboarding uzerinden veriliyor.

## Frontend

- `/register`
  - Musteri / Nakliyeci sekmeleri korundu.
  - Nakliyeci sekmesi ilk arac alanlarini toplamaya devam ediyor.
  - Duplicate email durumunda inline yonlendirici hata gosteriliyor.
  - Authenticated kullanici register yerine `/dashboard/profil` ekranina yonlendiriliyor.

- `/dashboard/profil`
  - `MUSTERI && !NAKLIYECI` kullanici icin `Nakliyeci rolunu ekle` CTA'si eklendi.

- Yeni onboarding sayfasi eklendi:
  - `/dashboard/profil/nakliyeci-rolu-ekle`
  - Ilk arac formunu topluyor.
  - Basari sonrasi auth store guncelleniyor, aktif workspace `carrier` oluyor ve kullanici `/dashboard` ekranina donuyor.

- Arac form alanlari ortaklastirildi.
  - Register carrier formu
  - Profile onboarding formu
  - `/dashboard/arac_ekle`
  ayni ortak vehicle field component'ini kullaniyor.

## Test ve Dogrulama

Calistirilan dogrulamalar:

- `npm run test:api`
- `npm run lint:api`
- `npm run lint:web`
- `npm run build:api`
- `npm run build:web`

API test kapsamina eklenen kritik senaryolar:

- customer register yalniz `MUSTERI` hesap acar
- carrier register dual-role + ilk arac uretir
- duplicate email register reddedilir
- profile onboarding basarili oldugunda yeni token ve dual-role user doner
- onboarding arac conflict'inde role grant yapilmaz
- self-serve business-role endpoint carrier role veremez
