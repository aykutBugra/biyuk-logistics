# Backend Stabilization Implementation

## Kapsam

Bu implementasyon fazinda su alanlar tamamlandi:

- `offers.accept` transaction rollback hardening
- `jobs.complete` transaction rollback hardening
- `GET /users` endpoint'inin admin-only hale getirilmesi
- JWT secret fallback'lerinin kaldirilmasi ve auth config'in fail-fast hale getirilmesi
- `offer-threads` write path'lerinin tx-guard ile sertlestirilmesi
- API test stack'inin kurulmasi ve kritik akislara test eklenmesi

Bu fazda bilincli olarak yapilmayanlar:

- full auth/session redesign
- refresh token rotation / revocation store
- cookie tabanli auth
- PrimeReact / UI refactor
- runtime response validation sistemi geneli

## Uygulanan Teknik Degisiklikler

### 1. Transaction discipline

- `apps/api/src/common/utils/unwrap-transaction-result.ts` eklendi.
- `apps/api/src/modules/offers/offers.service.ts` icinde `acceptOfferInTransaction` sonucu callback icinde unwrap edilip conflict durumunda exception firlatacak sekilde degistirildi.
- `apps/api/src/modules/jobs/jobs.service.ts` icinde `completeByIdAndCarrierIdInTransaction` sonucu callback icinde unwrap edilip rollback zorunlu hale getirildi.

Sonuc:

- Artık `ok: false` sonucu callback disina "commit edilebilir hata" olarak cikmiyor.
- Invariant bozulursa transaction callback hata ile sonlandigi icin rollback zorunlu oluyor.

### 2. `/users` veri yuzeyi

- `apps/api/src/modules/users/users.controller.ts` admin role ile sinirlandi.
- `apps/api/src/modules/users/users.module.ts` icine `RolesGuard` provider'i eklendi.

Sonuc:

- `GET /users` artik authenticated herkese acik degil.
- `GET /auth/me` self-profile kaynagi olarak korunuyor.

### 3. Auth config hardening

- `apps/api/src/config/auth.config.ts` icindeki `dev-access-secret` ve `dev-refresh-secret` fallback'leri kaldirildi.
- Secret env'leri bos veya eksikse boot sirasinda hata veren fail-fast guard eklendi.
- TTL default'leri tek kaynakta toplandi.
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/jwt.strategy.ts`
- `apps/api/src/modules/auth/auth.service.ts`

Bu dosyalarda config okumasi `getOrThrow(...)` ile sertlestirildi.

Sonuc:

- API artik eksik JWT secret ile sessizce zayif secret'a dusmuyor.
- Secret ve TTL config drift'i daraltildi.

### 4. Offer thread write atomikligi

- `apps/api/src/modules/offer-threads/offer-threads.service.ts` icinde text ve counter-offer write path'leri ortak transaction helper altina alindi.
- Writability kontrolu tx icinde yeniden yapiliyor.
- Transaction isolation seviyesi `Serializable` olarak ayarlandi.
- `apps/api/src/modules/offer-threads/repositories/offer-threads.repository.ts` icinde writable context sorgusu executor alacak sekilde genislendi.

Sonuc:

- Writability kontrolu ile write arasindaki pencere daraltildi.
- Counter-offer ve text message path'leri ayni disipline alindi.
- Notification publish commit sonrasi kaldi.

## Test Altyapisi

Kurulan test omurgasi:

- `jest`
- `ts-jest`
- `@nestjs/testing`
- `supertest`

Eklenen dosyalar:

- `apps/api/jest.config.cjs`
- `apps/api/test/setup.ts`
- `apps/api/test/offers.accept.spec.ts`
- `apps/api/test/jobs.complete.spec.ts`
- `apps/api/test/auth.spec.ts`
- `apps/api/test/offer-threads.write.spec.ts`
- `apps/api/test/users.admin-only.spec.ts`

Eklenen script'ler:

- root `package.json`: `test`, `test:api`
- `apps/api/package.json`: `test`, `test:watch`

## Dogrulama

Calistirilan komutlar:

- `npm run test:api`
- `npm run lint:api`
- `npm run build:api`

Sonuc:

- tum testler gecti
- API lint gecti
- API build gecti

## Sonraki Adimlar

Bu fazdan sonra en mantikli sira:

1. auth/session redesign'i ayri bir fazda ele almak
2. gerekirse backend contract'lari sabitlendikten sonra UI/PrimeReact redesign planina gecmek
