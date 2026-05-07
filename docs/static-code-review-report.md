# Static Code Review Report

## Amac

Bu raporun amaci, `C:\Users\aykut\nakliye-app` reposunun mevcut kod kalitesini statik olarak degerlendirmek, gercek bug ve bakim risklerini onceliklendirmek ve projenin genel mimari saglamligini olcmektir. Inceleme yeni ozellik eklemeyi degil, mevcut yapinin ne kadar guvenli, tutarli ve surdurulebilir oldugunu anlamayi hedefler.

## Incelenen Alanlar

- `apps/api`
- `apps/web`
- kok ve workspace `package.json` script'leri
- build/lint sonuclari
- test altyapisi varligi
- ozellikle su hotspot'lar:
- backend: `offers`, `offer-threads`, `transport-requests`, `jobs`, `auth`, `users`, `vehicles`, `volume-estimation`
- frontend: buyuk dashboard page'leri, `lib/api`, auth storage/access hook'lari, `VolumeEstimateAssistant`, `OpenRequestsMapPanel`

## Genel Degerlendirme

Repo, calisan ve moduler bir temel uzerine kurulmus, fakat henuz "yapisal olarak saglam" denecek seviyede degil. Ozellikle backend'de kritik lifecycle mutasyonlarinda transaction butunlugu bozulabiliyor; auth tarafinda guvenli varsayilanlar yeterince siki degil; frontend'de ise buyuk client page'ler icinde veri yukleme, auth yonlendirme, hata yonetimi ve UI state birikmis durumda.

Kisa cevap: bu repo su an **calisan ama refactor isteyen bir repo**. Bunun ana nedenleri:

- kritik business flow'larda kismi commit riski bulunmasi
- least-privilege ilkesini bozan kullanici verisi erisimi
- test altyapisinin olmamasi nedeniyle karmasik akislarin guvence altina alinmamis olmasi

## Guclu Taraflar

- Backend moduler monolith yaklasimi genel olarak tutarli. `AppModule` altinda domain modulleri ayrilmis ve controller/service/repository duzeni cogu modulde korunmus.
- Global `ValidationPipe` etkin ve `whitelist`, `transform`, `forbidNonWhitelisted` acik (`apps/api/src/main.ts:18-26`). Bu, giris validation kalitesini belirgin bicimde yukseltiyor.
- DTO ve response type kullanimi genel olarak duzenli. Ozellikle transport request, offer ve volume-estimation yuzeylerinde tipler net.
- Ownership filtreleri bircok repository metodunda dogrudan sorguya tasinmis. Ornek: `findByIdAndCustomerId`, `findByIdAndCarrierId`, `softDeleteByIdAndOwnerId`.
- Web tarafinda `lib/api` katmani ile cagrilar UI'dan ayrilmis; `lib/logistics.ts` gibi ortak formatter/util dosyalari tekrarlari sinirliyor.
- Mevcut kalite kapilari temiz: `build` ve `lint` hem API hem web icin geciyor.

## Kritik Riskler

- **Kritik: offer kabul akisinda kismi commit riski var.** `apps/api/src/modules/offers/repositories/offers.repository.ts:890-996` icinde `acceptOfferInTransaction`, once offer statusunu guncelliyor (`921-929`), sonra request statusunu guncelliyor (`938-946`), ama request update basarisiz olursa sadece `return { ok: false }` donuyor (`949-953`). Bu metod `apps/api/src/modules/offers/offers.service.ts:448-526` icinde transaction callback'inde cagriliyor ve hata transaction icinde firlatilmadigi icin callback basarili donuyor; sonuc olarak accepted offer commit olup service disarida `409` donebilir. Bu, teklif/istek/nakliye state'lerini birbirinden koparabilecek gercek veri butunlugu bug'idir.
- **Kritik: shipment tamamlama akisinda ayni kismi commit paterni var.** `apps/api/src/modules/jobs/repositories/jobs.repository.ts:281-321` icinde shipment once `TAMAMLANDI` statusune cekiliyor (`285-295`), sonra request tamamlanmaya calisiliyor (`304-312`). Request update basarisiz olursa yine sadece `return { ok: false }` donuluyor (`314-318`). Bu metod `apps/api/src/modules/jobs/jobs.service.ts:192-223` icindeki transaction callback'inden donuyor; service transaction disinda `ConflictException` firlatiyor. Sonuc: API hata donerken shipment tamamlanmis olabilir.
- **Kritik: `/users` endpoint'i tum aktif kullanicilarin PII verisini tum authenticated kullanicilara aciyor.** `apps/api/src/modules/users/users.controller.ts:26-29` tum aktif profilleri donduruyor. `apps/api/src/modules/users/users.service.ts:69-72` bunu dogrudan repository'den aliyor. `apps/api/src/modules/users/dto/user-profile-response.dto.ts:4-11` ise `mail`, `telefonNumarasi` ve `roles` alanlarini response'a koyuyor. Bu, least-privilege ilkesini ihlal eden net bir veri yayilim riski.
- **Kritik: JWT secret'lar eksik env durumunda tahmin edilebilir default degerlerle ayaga kalkiyor.** `apps/api/src/config/auth.config.ts:5-9` icinde `dev-access-secret` ve `dev-refresh-secret` fallback'leri var. Ayni fallback `apps/api/src/modules/auth/auth.service.ts:281-293` icinde tekrar bulunuyor. Deployment tarafinda env yanlis/eksik ise auth sistemi sessizce zayif secret ile calisabilir; bu dogrudan token uretimi ve dogrulamasini tahmin edilebilir hale getirir.

## Orta Seviye Sorunlar

- **Offer thread yazma akislarinda race condition ve atomiklik riski var.** `apps/api/src/modules/offer-threads/offer-threads.service.ts:99-145` once `requireWritableContext` ile thread yazilabilir mi diye bakiyor (`422-440`), sonra repository'ye yaziyor. Repository tarafinda `createCounterOfferMessage` once `teklif` fiyatini update ediyor (`apps/api/src/modules/offer-threads/repositories/offer-threads.repository.ts:556-569`), sonra mesaj olusturuyor (`571-604`). Bu iki adim tek atomic guard ile korunmuyor; arada offer kapanirsa veya ikinci adim fail olursa state kayabilir.
- **Offer thread inbox tarafinda N+1 query paterni var.** `apps/api/src/modules/offer-threads/offer-threads.service.ts:50-58` thread ozetlerini topladiktan sonra her kayit icin `toThreadSummaryResponse` cagriyor; bu fonksiyon `countUnreadMessages` cagrisi yapiyor (`269-280`). Ayni durum detay response'unda da var (`316-324`). Repository tarafinda unread count ayri query (`apps/api/src/modules/offer-threads/repositories/offer-threads.repository.ts:447-453`). Thread sayisi buyudukce bu liste endpoint'ini pahali hale getirecek.
- **Session token'lari tarayici `localStorage` icinde tutuluyor.** `apps/web/src/lib/auth/auth-storage.ts:62-115` access ve refresh token'i localStorage'dan okuyor/yaziyor. Bu yaklasim XSS durumunda token ele gecirilmesini kolaylastirir. Buna ek olarak refresh akisi tamamen stateless; `apps/api/src/modules/auth/auth.service.ts:126-147` refresh token'i yalnizca verify edip yeni token cifti uretiyor, server-side revocation/rotation store gorunmuyor.
- **Frontend API type safety sadece compile-time duzeyinde; runtime response validation yok.** `apps/web/src/lib/api/api-client.ts:59-73` basarili response'u dogrudan `response.json() as Promise<T>` ile cast ediyor. Backend shape drift veya kismi bozuk response durumunda UI runtime'da kirilabilir ve bu, TypeScript tarafindan yakalanmaz.
- **Buyuk dashboard page'leri veri yukleme, auth redirect, hata yonetimi ve etkilesim mantigini tek dosyada topluyor.** Ornekler:
- `apps/web/src/app/dashboard/acik_istekler/page.tsx` yaklasik `945` satir
- `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx` yaklasik `867` satir
- `apps/web/src/app/dashboard/isteklerim/[id]/page.tsx` yaklasik `727` satir
  Bu sayfalarda ayni 401/403/login redirect ve `window.alert` akislari tekrar ediyor (`acik_istekler/page.tsx:201-380`, `acik_istekler/[id]/page.tsx:153-367`, `isteklerim/[id]/page.tsx:101-351`). Bu hem state karmasikligi hem de UX tutarsizligi riski yaratiyor.
- **Calistirilabilir repo testi yok.** Kok script'lerde yalniz `build`, `lint`, `dev`, `prisma:generate` var (`package.json:8-18`). `apps/api/package.json:4-11` ve `apps/web/package.json:4-8` icinde de test script'i bulunmuyor. `apps` altinda `node_modules` haric repo test dosyasi tespit edilmedi. Bu, ozellikle offer acceptance, shipment completion, auth refresh ve thread messaging gibi karmasik akislarda regresyon riskini ciddi bicimde artiriyor.
- **Bildirim basarisizliklari tamamen swallow ediliyor.** `apps/api/src/modules/notifications/notifications.publisher.ts:170-194` hata durumunda yalniz log yaziyor ve akisi devam ettiriyor. Bu tasarim anlasilir, fakat outbox/retry/visible failure olmadan kullanici bildirimleri sessizce kaybolabilir.

## Dusuk Oncelikli Sorunlar

- **Dosyalarda bozulmus Turkce yorumlar var.** Ozellikle `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/users/repositories/users.repository.ts`, `apps/api/src/modules/transport-requests/transport-requests.service.ts`, `apps/api/src/modules/offer-threads/offer-threads.service.ts` icinde encoding bozulmus yorumlar okunabilirligi dusuruyor.
- **Dil ve hata mesaji tutarliligi zayif.** Ayni akista Turkce ve Ingilizce hata mesajlari karisiyor. Ornek: auth, offers ve jobs servislerinde farkli dil tercihleri var.
- **Bazi service/repository dosyalari sinirlarina yaklasmis durumda.** `apps/api/src/modules/offers/repositories/offers.repository.ts` yaklasik `1130` satir, `apps/api/src/modules/offers/offers.service.ts` yaklasik `797` satir, `apps/api/src/modules/offer-threads/repositories/offer-threads.repository.ts` yaklasik `721` satir. Bu hemen bug degildir ama bakim maliyetini artirir.
- **Abstraction leak ornekleri mevcut.** `apps/api/src/modules/users/users.service.ts:69-72` icinde repository cast edilerek ozel bir interface kullaniliyor; bu tip pattern'ler katman sinirlarini zayiflatir.

## Mimari Gozlemler

- Genel yon dogru: backend moduler domain'lere ayrilmis, frontend de `app/components/lib` seklinde okunabilir bir iskelete sahip.
- Controller/service/repository ayrimi cogu modulde korunuyor; bu olumlu. Ancak business invariants birkac buyuk servis/repository'de birikmis.
- En belirgin mimari gerilim `offers` ve `offer-threads` etrafinda. Route filtering, offer lifecycle, thread lifecycle, notification, capacity reservation ve status transition'lar birkac buyuk dosyada kesisiyor.
- Status yonetimi cok sayida modulde string constant setleriyle yurutuluyor. Bu yaklasim kisa vadede calisir, ama farkli moduller arasi drift riski yaratir.
- Sonuc olarak mimari "kotu" degil; fakat kritik invariant'larin ispati test ve transaction disipliniyle desteklenmedigi icin guven seviyesi dusuyor.

## Backend Gozlemleri

- Guclu yanlar:
- modul ayrimi net
- DTO validation ciddi sekilde kullaniliyor
- ownership filtreleri cogu yerde repository'ye tasinmis
- volume-estimation gibi yeni alanlar ayri modul icinde izole tutulmus
- Zayif yanlar:
- transaction correctness bazi lifecycle mutasyonlarinda bozuk
- auth varsayilanlari fazla gevsek
- `users` modulu gereginden genis veri yuzeyi aciyor
- `offers`, `offer-threads`, `jobs` cevresinde business logic yogunlugu cok yuksek
- bazi akislar concurrency-safe gorunmuyor

## Frontend Gozlemleri

- Guclu yanlar:
- `lib/api` katmani mevcut
- auth access hook'lari sayfa erisimlerini belli olcude merkezilestiriyor
- ortak formatter/util kullanimi var
- Zayif yanlar:
- buyuk route page'leri asiri stateful client component'lere donusmus
- auth redirect, 401/403 handling, `window.alert`, `isMounted` pattern'i sik tekrar ediyor
- UI ve network orchestration cok ic ice
- runtime response validation olmadigi icin backend/frontend contract drift'i sessiz kirilmaya acik
- `localStorage` token yaklasimi guvenlik borcu tasiyor

## Build / Lint Sonuclari

- `npm run build:api`: gecti
- `npm run lint:api`: gecti
- `npm run build:web`: gecti
- `npm run lint:web`: gecti

Test altyapisi:

- kok script'lerde test komutu yok (`package.json:8-18`)
- `apps/api/package.json` icinde test script'i yok (`4-11`)
- `apps/web/package.json` icinde test script'i yok (`4-8`)
- `apps` altinda `node_modules` haric repo test dosyasi tespit edilmedi

## Teknik Borc Ozeti

- kritik business flow'larda test eksikligi
- transaction-safe mutation discipline eksikligi
- auth guvenlik varsayimlarinin gevsek olmasi
- cok buyuk page/service/repository dosyalari
- frontend'de tekrar eden auth/error/loading akislar
- runtime schema validation eksikligi
- yorum ve hata metinlerinde tutarsizlik

## Oncelikli Refactor Onerileri

- Offer acceptance ve shipment completion transaction'larinda invariant bozulursa transaction callback icinde exception firlatilmali; kismi commit ihtimali kaldirilmali.
- `/users` endpoint'i least-privilege mantigiyla daraltilmali. Gerekliyse sadece sinirli public profil alanlari veya yalniz self/admin erisimi birakilmali.
- JWT secret fallback'leri kaldirilmali; eksik env ile uygulama fail-fast davranmali.
- Refresh token stratejisi gozden gecirilmeli. Ozellikle localStorage + stateless refresh kombinasyonu icin net guvenlik karari verilmeli.
- `offer-threads` yazma akislari icin atomic write ve concurrency guard eklenmeli.
- Frontend'de ortak authenticated fetch/error/redirect hook veya page loader pattern'i cikarilmali.
- En azindan su akislar icin otomasyon eklenmeli:
- offer accept / reject
- shipment complete
- auth refresh
- offer thread message / counter-offer

## Sonuc

Repo genel olarak is yapan, canliya yakin ve moduler bir tabana sahip. Ancak kritik mutation correctness ve auth yuzeyi nedeniyle su haliyle "saglam bir cekirdek uzerine kurulmus, ama henuz guvenli sekilde olceklenmeye hazir olmayan" bir repo profili ciziyor. Kisa vadede en onemli kazanim yeni ozellik degil; state transition guvenligi, kullanici verisi erisim siniri ve temel test guvence katmanini duzeltmek olur.

Cok kisa ozet:

- **Repo genel olarak ne durumda:** Calisiyor, build/lint temiz, ama kritik backend akislarinda gercek bug riski tasidigi icin refactor isteyen bir repo.
- **En riskli 5 nokta:** offer kabul transaction'i, shipment tamamlama transaction'i, `/users` uzerinden PII yayilimi, JWT secret fallback'leri, localStorage + stateless refresh auth modeli.
- **Once duzeltilmesi gereken 3 sey:** transaction butunlugu, kullanici dizini yetkilendirmesi/PII daraltma, auth secret ve session modelinin sikilastirilmasi.
