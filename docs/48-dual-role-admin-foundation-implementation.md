# Dual-Role + Admin Foundation Implementation

## Amaç

Bu fazda tek hesap altında coklu business role (`MUSTERI`, `NAKLIYECI`) temeli guclendirildi, `ADMIN` self-serve rolden ayrildi, dual-role kullanicida carrier-first davranislar temizlendi ve self-dealing risklerine backend savunmalari eklendi.

## Uygulanan Degisiklikler

### Backend

- `UserProfileResponseDto` ve role response yuzeyleri `businessRoles` ve `isAdmin` alanlariyla genisletildi.
- `POST /roles/me/business-role` endpoint'i eklendi.
  - Kullanici eksik business role'unu ayni hesaba ekleyebilir.
  - `ADMIN` self-serve olarak eklenemez.
- `offers.accept` ve `offers.reject` tarafina explicit self-dealing guard eklendi.
- `jobs` read akislari dual-role icin explicit `?as=customer|carrier` baglamina gecirildi.
  - Carrier-first fallback kaldirildi.
  - Job response'larina `participantSide` eklendi.
- `jobs.start` ve `jobs.complete` tarafina self-shipment savunmasi eklendi.
- `offer-threads` listesinde opsiyonel `?as=customer|carrier` destegi eklendi.
  - Thread response'larina `participantSide` eklendi.
  - Same-user-both-sides anomalileri bootstrap/read/write/lifecycle path'lerinde conflict ile durduruluyor.
- Notification publisher katmanina self-recipient suppress eklendi.

### Frontend

- Auth storage modeli `businessRoles`, `isAdmin` ve dashboard workspace tercihini destekleyecek sekilde genislendi.
- Dual-role kullanici icin yeni `GET /dashboard` landing/chooser sayfasi eklendi.
- `Panelim` linki dual-role kullanicida workspace chooser'a yonleniyor.
- Shared dashboard sayfalari (`konusmalar`, `bildirimler`, `profil`, `puanlarim`) aktif workspace'e gore shell secmeye basladi.
- Carrier page hook'lari ve customer page hook'lari aktif workspace tercihini senkronluyor.
- Jobs ve offer-thread web API client'lari yeni `as` / `participantSide` contract'ina guncellendi.

## Testler

Su alanlar icin otomasyon eklendi veya guncellendi:

- business role ekleme servisi
- dual-role jobs read context
- self-shipment completion guard
- self-offer decision guard
- offer thread role-context filtresi
- self-thread write guard
- self-recipient notification suppress
- onceki backend stabilization testleriyle uyum

Calistirilan komutlar:

- `npm run test:api`
- `npm run lint:api`
- `npm run lint:web`
- `npm run build:api`
- `npm run build:web`

## Bilincli Olarak Yapilmayanlar

- tam admin panel
- blanket admin mutate override
- full auth/session redesign
- PrimeReact veya genel dashboard redesign
- kompleks permission engine
- organization/tenant modeli

## Sonraki Adim

Bu foundation tamamlandigi icin siradaki mantikli faz:

1. navigation / dashboard information architecture
2. sonra PrimeReact / UI redesign
