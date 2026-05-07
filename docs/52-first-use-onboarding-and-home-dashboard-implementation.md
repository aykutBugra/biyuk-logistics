# First Use Onboarding And Home Dashboard Implementation

## Amac

`/dashboard` deneyimini iki ayri urun katmanina bolmek:

- ilk kullanimda buyuk ama tek seferlik onboarding gostermek
- sonrasinda ayni route'u kalici operasyonel home dashboard olarak calistirmak

Bu implementasyonla buyuk hero alani kalici dashboard icerigi olmaktan cikarildi; tekrar eden kullanici artik dogrudan is odakli home'a dusuyor.

## Urun Karari

- Onboarding state `user-level + role-scoped` olarak tutuldu.
- Source of truth `localStorage` degil, server-side user kaydi oldu.
- Flag modeli iki ayri timestamp ile kuruldu:
  - `customerIntroDismissedAt`
  - `carrierIntroDismissedAt`
- `admin-only` kullanici bu onboarding modeline dahil edilmedi; mevcut `/dashboard/admin` girisi korundu.
- `dual-role` kullanici icin bloklayici chooser kaldirildi.
- Normal kullanimda dual-role home tek ekran ama iki net blok olarak kurgulandi:
  - `Musteri alanim`
  - `Nakliyeci alanim`

## Backend Degisiklikleri

- Prisma `Kullanici` modeline eklendi:
  - `customerIntroDismissedAt DateTime?`
  - `carrierIntroDismissedAt DateTime?`
- Yeni migration eklendi:
  - `apps/api/prisma/migrations/20260505110000_add_dashboard_intro_dismissal_flags/migration.sql`
- Yeni ortak type eklendi:
  - `apps/api/src/common/types/dashboard-intro-role.type.ts`
- `UserProfileResponseDto` onboarding timestamp'lerini donecek sekilde genisletildi.
- `UsersRepository` auth/profile select'leri onboarding alanlarini da tasiyacak sekilde guncellendi.
- `UsersRepository.dismissDashboardIntroById()` eklendi.
- `UsersService.dismissDashboardIntro()` eklendi.
- Yeni authenticated self endpoint eklendi:
  - `PATCH /auth/me/dashboard-intro`
- Yeni DTO eklendi:
  - `DismissDashboardIntroDto`
- `register`, `login`, `refresh`, `carrier onboarding` ve `/auth/me` akislari guncel user profile alanlarini tasir hale geldi.

## Frontend Degisiklikleri

- `StoredAuthUser` ve `UserProfile` tiplerine onboarding timestamp alanlari eklendi.
- Yeni web auth helper eklendi:
  - `dismissMyDashboardIntro(accessToken, role)`
- Auth storage'a yeni yardimci mantiklar eklendi:
  - `mergeStoredAuthUser`
  - `getPendingDashboardIntroRole`
  - dual-role icin sessiz varsayilan workspace cozumleme
- `useDashboardAccess()` artik dual-role kullaniciyi `workspace null` nedeniyle tekrar `/dashboard` chooser ekranina zorlamiyor.
- Login basarili oldugunda hedef route `/dashboard` oldu.

## Dashboard Davranis Degisiklikleri

- `/dashboard` sayfasi tamamen yeniden kurgulandi.
- Ilgili role onboarding pending ise buyuk onboarding paneli gosteriliyor.
- Onboarding kapatilinca ayni route operasyonel home'a donuyor.
- `customer-only` kullanici:
  - customer onboarding
  - sonrasinda customer home
- `carrier-only` kullanici:
  - carrier onboarding
  - sonrasinda carrier home
- `customer -> sonra carrier role ekleyen` kullanici:
  - mevcut customer intro state korunur
  - yalniz carrier intro bir kez gosterilir
- `dual-role` kullanici:
  - surekli chooser gormez
  - tek home ekraninda customer ve carrier bloklarini ayni anda gorur
- `admin + business` kullanici:
  - business home icinde ek admin giris karti gorur

## Home Dashboard Icerigi

Musteri home:

- stat kartlari:
  - `Isteklerim`
  - `Acik akista`
  - `Gelen teklifler`
  - `Anlasilan is`
  - `Okunmamis konusma`
  - `Okunmamis bildirim`
- hizli aksiyonlar:
  - `Yeni istek olustur`
  - `Isteklerime git`
  - `Gelen teklifleri ac`
  - `Konusmalari ac`
- carrier role'u olmayan hesapta kucuk `Nakliyeci rolunu ekle` genisleme karti

Nakliyeci home:

- stat kartlari:
  - `Tekliflerim`
  - `Nakliyelerim`
  - `Rotalarim`
  - `Araclarim`
  - `Okunmamis konusma`
  - `Okunmamis bildirim`
- hizli aksiyonlar:
  - `Acik isteklere git`
  - `Tekliflerimi ac`
  - `Nakliyelerimi yonet`
  - `Rotalarima git`
  - `Araclarimi ac`
- rota veya arac setup eksiginde kompakt hazirlik karti

Ortak alanlar:

- `Konusmalar`
- `Bildirimler`
- `Profil`
- `Puanlarim`

## Mikro Yardim Sistemi

- Buyuk onboarding tek seferlik kaldirildi.
- Kalici yardim icin click tabanli mikro yardim paneli eklendi.
- Yeni reusable component:
  - `apps/web/src/components/InlineHelpTrigger.tsx`
- Yeni help registry:
  - `apps/web/src/lib/dashboard/help-content.ts`
- Ilk kapsama alani:
  - `/dashboard`
  - `/dashboard/acik_istekler`
  - `/dashboard/acik_istekler/[id]`
  - `/dashboard/gelen_teklifler`
  - `/dashboard/rotalarim`
  - `/dashboard/profil/nakliyeci-rolu-ekle`

## Shell Ve Navigation Etkisi

- `DashboardShellFrame` ve shell wrapper'lari page-level `headerActions` destekler hale getirildi.
- Sidebar'daki workspace toggle korundu ama bloklayici chooser rolu kaldirildi.
- Shared sayfalarda aktif baglam sessizce cozumlenir; kullanici her giriste secim ekranina itilmez.

## Test Ve Dogrulama

Calistirilan komutlar:

- `npm run prisma:generate` in `apps/api`
- `npm run build` in `apps/api`
- `npm run test -- --runTestsByPath test/auth.registration-onboarding.spec.ts test/auth.spec.ts test/roles.business-role.spec.ts test/auth.account-deletion.spec.ts` in `apps/api`
- `npm run build` in `apps/web`
- `npm run lint` in `apps/web`

Sonuc:

- API build gecti
- secili auth ve role testleri gecti
- web build gecti
- web lint gecti

## Bilincli Olarak Yapilmayanlar

- PrimeReact tabanli gorsel redesign
- tum dashboard sayfalarini bastan cizmek
- analytics veya KPI motoru
- buyuk multi-step product tour
- tam help center veya docs sistemi
- admin backoffice genisletmesi

## Ozet

Bu turda `/dashboard` artik kalici hero sayfasi degil. Kullanici ilgili role ilk kez girdiginde onboarding bir kez goruluyor, kapatilinca state server-side saklaniyor ve sonraki girislerde gercek operasyonel home aciliyor. Dual-role kullanici surekli chooser gormuyor; ayni home icinde customer ve carrier bloklarini birlikte kullaniyor. Buyuk onboarding'in yerini ise kritik ekranlarda acilabilen kisa mikro yardim panelleri tamamliyor.
