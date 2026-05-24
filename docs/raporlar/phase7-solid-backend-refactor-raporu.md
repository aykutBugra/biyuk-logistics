# Phase 7 - SOLID Backend Refactor ve Hata Yönetimi Raporu

## 1. Amaç

Phase 7, `apps/api` NestJS backend'inde iş davranışını ve veritabanı şemasını değiştirmeden:

- Dağınık Nest `HttpException` kullanımını merkezi hata kodları ve tutarlı HTTP cevap gövdesi ile standartlaştırmak
- Gerçek değer sağlayan noktalarda bağımlılık tersine çevirme (DIP) uygulamak
- Controller–service–repository sınırlarını koruyarak bakım ve test edilebilirliği artırmak

**Kapsam dışı:** Prisma migration, frontend değişikliği, büyük repository/service bölme, transaction/lifecycle mantığı değişikliği.

---

## 2. Mevcut Durum Analizi

### 2.1 Phase 7 öncesi

| Alan | Durum |
|------|--------|
| `common/errors` | Yoktu; yalnızca guards, public-id pipe, utils |
| Global exception filter | Yok; Nest varsayılan JSON (`statusCode`, `message`) |
| Hata kodları | Stabil `code` alanı yok |
| Exception yoğunluğu | `offers.service` (~31), `transport-requests` (~26), `jobs` (~23), `offer-threads` (~15) |
| DIP | `locations` token+contract iyi; OpenAI ve bildirim somut sınıf |
| Controller katmanı | İnce; iş mantığı servislerde |
| Repository | Var; servislerde ek `PrismaService.$transaction` kullanımı (bilinçli, değiştirilmedi) |

### 2.2 Frontend uyumluluk

`apps/web/src/lib/api/api-client.ts` hata gövdesinden yalnızca `message` okur. Yeni alanlar (`success`, `code`, `timestamp`, `path`) eklendi; `message` korundu.

---

## 3. SOLID Prensiplerine Göre Tespitler

### 3.1 Single Responsibility (SRP)

- **Tespit:** `offers.service` (~970 satır), `offer-threads.service` (~1064), `transport-requests.service` (~840), `offers.repository` (~1325) birden fazla sorumluluk taşıyor.
- **Phase 7:** Büyük dosya bölünmedi (davranış riski). Hata üretimi `AppErrors` factory'ye taşındı; sorumluluk ayrımı netleşti, dosya boyutu aynı kaldı.
- **Phase 7:** `OfferThreadMediaService` ile görsel işleme/storage sorumluluğu `offer-threads.service.ts` içinden ayrıldı.

### 3.2 Open/Closed (OCP)

- **Tespit:** Yeni bildirim tipi veya volume provider eklemek somut sınıfa bağlıydı.
- **Phase 7:** `NotificationPublisherPort` ve `VolumeEstimationPort` ile genişleme noktası eklendi; mevcut implementasyonlar değişmeden modül wiring ile bağlanıyor.

### 3.3 Liskov Substitution (LSP)

- **Tespit:** Kalıtım az; `MediaStorageService` abstract zaten vardı.
- **Phase 7:** `App*Exception` sınıfları ilgili Nest exception'larını extend eder (`AppConflictException extends ConflictException`). Unit testlerde `instanceof ConflictException` kontrolleri geçmeye devam eder.

### 3.4 Interface Segregation (ISG)

- **Tespit:** `OffersService` çok sayıda bağımlılık inject ediyor.
- **Phase 7:** Yalnızca cross-cutting ihtiyaçlar için ince portlar (`NotificationPublisherPort`, `VolumeEstimationPort`); gereksiz interface patlaması yapılmadı.

### 3.5 Dependency Inversion (DIP)

| Bağımlılık | Öncesi | Sonrası |
|------------|--------|---------|
| Google Places/Routes | Token + contract (mevcut) | Korundu; Google sınıfları `AppErrors` kullanıyor |
| Media storage | Abstract `MediaStorageService` | Korundu |
| OpenAI volume | Somut `OpenAiVolumeEstimationService` | `VolumeEstimationPort` + `VOLUME_ESTIMATION_PROVIDER` |
| Bildirimler | Somut `NotificationsPublisher` | `NotificationPublisherPort` + `NOTIFICATION_PUBLISHER` |

---

## 4. Hata/Exception Yönetimindeki Mevcut Problemler (Öncesi)

1. Modül başına dağınık `throw new BadRequestException` / `NotFoundException` / …
2. TR/EN karışık mesajlar; stabil makine-okunur `code` yok
3. Validation ve iş kuralı hataları aynı şekilde dönüyor, fakat `code` ile ayrıştırılamıyordu
4. Global filter olmadığı için log/izleme ve API sözleşmesi modüle göre değişiyordu

---

## 5. Yapılan Mimari Düzenlemeler

### 5.1 Yeni `common/errors` katmanı

```
apps/api/src/common/errors/
  app-error-code.ts
  app-exception.ts
  app-exception.factory.ts
  error-response.dto.ts
  global-app-exception.filter.ts
  index.ts
```

### 5.2 Global filter kaydı

`apps/api/src/main.ts` içinde:

```typescript
app.useGlobalFilters(new GlobalAppExceptionFilter());
```

### 5.3 Standart hata cevabı

```json
{
  "success": false,
  "code": "OFFER_CANNOT_ACCEPT",
  "message": "Offer can no longer be accepted.",
  "statusCode": 409,
  "timestamp": "2026-05-24T12:00:00.000Z",
  "path": "/api/v1/offers/.../accept"
}
```

- **Mesajlar:** Mevcut kullanıcı metinleri birebir korundu.
- **HTTP status:** Önceki Nest exception sınıfı ile aynı (ör. 429 rate limit `AppTooManyRequestsException`).

---

## 6. Merkezi Error Code / Exception Yapısı

### 6.1 `AppErrorCode`

Domain önekli sabitler: `AUTH_*`, `REQUEST_*`, `OFFER_*`, `JOB_*`, `THREAD_*`, `VEHICLE_*`, `VOLUME_*`, `LOCATION_*`, vb.

### 6.2 `AppErrors` factory

| Metod | HTTP | Nest uyumluluk |
|-------|------|----------------|
| `badRequest` | 400 | `AppBadRequestException` |
| `unauthorized` | 401 | `AppUnauthorizedException` |
| `forbidden` | 403 | `AppForbiddenException` |
| `notFound` | 404 | `AppNotFoundException` |
| `conflict` | 409 | `AppConflictException` |
| `tooManyRequests` | 429 | `AppTooManyRequestsException` |
| `internal` | 500 | `AppInternalServerErrorException` |
| `serviceUnavailable` | 503 | `AppServiceUnavailableException` |
| `badGateway` | 502 | `AppBadGatewayException` |

### 6.3 Geriye dönük uyumluluk

- Nest tabanlı exception'lar (ValidationPipe) filter'da `VALIDATION_FAILED` veya `HTTP_ERROR` ile map edilir; `message` dizisi korunur.
- `appCode` property'si olan exception'larda `code` alanı doğrudan kullanılır.

---

## 7. Dış Servis Bağımlılıklarında Yapılan İyileştirmeler

### 7.1 `NotificationPublisherPort`

- Dosya: `modules/notifications/notification-publisher.port.ts`
- Token: `NOTIFICATION_PUBLISHER`
- `NotificationsPublisher` implementasyon olarak kaldı; `offers`, `jobs`, `offer-threads`, `ratings` `@Inject(NOTIFICATION_PUBLISHER)` kullanıyor.

### 7.2 `VolumeEstimationPort`

- Dosya: `modules/volume-estimation/volume-estimation.port.ts`
- Token: `VOLUME_ESTIMATION_PROVIDER`
- `OpenAiVolumeEstimationService` implement eder; `VolumeEstimationService` port üzerinden çağırır.

### 7.3 Korunan yapılar

- `LOCATION_PROVIDER`, `ROUTE_ENGINE`, `MediaStorageService` — Phase 7'de değiştirilmedi.

---

## 8. Controller-Service-Repository Ayrımında Yapılan İyileştirmeler

| Katman | Değişiklik |
|--------|------------|
| Controller | Değişmedi; ince kalıp korundu |
| Service | Exception'lar `AppErrors` + `AppErrorCode` ile merkezileştirildi |
| Repository | Exception throw edilmedi; persistence sorumluluğu aynı |
| Transaction | `prisma.$transaction` blokları **dokunulmadı** (offers, jobs, offer-threads, transport-requests, auth) |

---

## 9. Etkilenen Dosya ve Modüller

### 9.1 Yeni dosyalar

- `apps/api/src/common/errors/*` (6 dosya + barrel)
- `apps/api/src/modules/notifications/notification-publisher.port.ts`
- `apps/api/src/modules/notifications/notification-publisher.token.ts`
- `apps/api/src/modules/volume-estimation/volume-estimation.port.ts`
- `apps/api/src/modules/volume-estimation/volume-estimation.tokens.ts`
- `apps/api/src/modules/offer-threads/offer-thread-media.service.ts`
- `apps/api/test/global-app-exception.filter.spec.ts`

### 9.2 Güncellenen modüller (exception migration)

| Modül | Ana dosyalar |
|-------|----------------|
| common | `guards/roles.guard.ts`, `public-ids/public-entity-id.ts` |
| auth | `auth.service.ts`, `jwt.strategy.ts` |
| users | `users.service.ts` |
| roles | `roles.service.ts` |
| locations | `locations.service.ts`, `google/*.ts` |
| carrier-routes | `carrier-routes.service.ts` |
| notifications | `notifications.service.ts`, `notifications.publisher.ts`, `notifications.module.ts` |
| ratings | `ratings.service.ts` |
| volume-estimation | `*.service.ts`, `volume-estimation.module.ts` |
| transport-requests | `transport-requests.service.ts` |
| offers | `offers.service.ts` |
| jobs | `jobs.service.ts` |
| offer-threads | `offer-threads.service.ts` |
| vehicles | `vehicles.service.ts` |
| media | `image-processing.service.ts` |

### 9.3 Test güncellemeleri

`NOTIFICATION_PUBLISHER` token mock'u: `jobs.*.spec.ts`, `offers.*.spec.ts`, `offer-threads.*.spec.ts`

---

## 10. Build/Test Sonuçları

| Komut | Sonuç |
|-------|--------|
| `npm run build -w @nakliye-app/api` | Başarılı |
| `npm run test -w @nakliye-app/api` | 15 suite, 59 test — tümü geçti |

Kritik senaryolar: `offers.accept`, `offers.create-date-plan`, `offer-threads.write`, `jobs.complete`, `auth.registration-onboarding`, `users.account-deletion`, `roles.business-role`.

---

## 11. Kalan Teknik Borçlar

1. **Büyük servis/repository dosyaları** — `offers.repository` ve `offers.service` lifecycle bölünmesi ayrı fazda; offer-thread medya extract tamamlandı.
2. **Transaction boundary** — `$transaction` hâlâ servis katmanında; unit of work pattern değerlendirilebilir.
3. **Mesaj dili birliği** — TR/EN karışıklığı korundu; i18n veya tek dil politikası Phase 7.1 olabilir.
4. **Frontend `code` kullanımı** — İsteğe bağlı; `message` yeterli kaldığı için web tarafına dokunulmadı.
5. **`unwrapTransactionResult` callback'leri** — Artık `AppErrors` döndürüyor; davranış aynı, tip olarak `ConflictException` alt sınıfı.

---

## 12. Sonuç

Phase 7, backend'de davranış ve şema değiştirmeden merkezi hata mimarisi ve seçilmiş DIP portları ile mimari kaliteyi yükseltti. Tüm modül servislerinde exception'lar `AppErrors` üzerinden üretiliyor; HTTP cevapları `GlobalAppExceptionFilter` ile tutarlı `success`/`code`/`message`/`statusCode`/`timestamp`/`path` şeklinde dönüyor. Mevcut unit testler ve frontend `message` parse akışı korunmuştur.

---

## Öncesi / Sonrası Karşılaştırması

| Alan | Öncesi | Yapılan düzenleme | Refactor sonrası kazanım | İlgili SOLID Prensibi | Etkilenen modül/dosya |
|------|--------|-------------------|-------------------------|------------------------|------------------------|
| Exception yönetimi | Her service içinde dağınık `BadRequestException` / `NotFoundException` | `AppErrors` + `AppErrorCode` + `GlobalAppExceptionFilter` | Hata formatı ve kodlar standartlaştı; `message` korundu | SRP, OCP | `common/errors/*`, tüm modül `*.service.ts` |
| HTTP cevap gövdesi | `{ statusCode, message }` | `{ success, code, message, statusCode, timestamp, path }` | API sözleşmesi dokümante edilebilir; izleme kolaylaştı | OCP | `main.ts`, `global-app-exception.filter.ts` |
| Dış servis (bildirim) | Service doğrudan `NotificationsPublisher` | `NotificationPublisherPort` + `NOTIFICATION_PUBLISHER` | Test mock ve provider değişimi kolaylaştı | DIP | `notifications.module.ts`, offers/jobs/offer-threads/ratings |
| Dış servis (OpenAI hacim) | Somut `OpenAiVolumeEstimationService` inject | `VolumeEstimationPort` + `VOLUME_ESTIMATION_PROVIDER` | Alternatif provider (noop/mock) eklenebilir | DIP | `volume-estimation.module.ts`, `volume-estimation.service.ts` |
| Google konum/rota | Token vardı; exception dağınık | Google provider/engine `AppErrors` | Tutarlı kod + aynı DIP modeli | DIP | `google-location.provider.ts`, `google-route.engine.ts` |
| Unit test uyumluluğu | `ConflictException` instance assert | `AppConflictException extends ConflictException` | Test mesajları kırılmadı | LSP | `app-exception.ts`, `test/*.spec.ts` |
| Rate limit (429) | `HttpException` + `TOO_MANY_REQUESTS` | `AppTooManyRequestsException` | Status 429 korundu, `code` eklendi | OCP | `volume-estimation-rate-limit.service.ts` |
| Controller katmanı | Zaten ince | Değişiklik yok | Sınır korundu | SRP | `*.controller.ts` |
| Offer-thread medya | Görsel upload/rollback `OfferThreadsService` içinde | `OfferThreadMediaService` extract | Medya pipeline tek yerde; ana servis inceldi | SRP | `offer-thread-media.service.ts`, `offer-threads.service.ts` |
| Transaction/lifecycle | Servis içi `$transaction` | Dokunulmadı | İş kuralları ve delivery confirmation güvende | — | offers/jobs/offer-threads/transport-requests |

---

## İşyeri Eğitimi Raporu İçin Kısa Özet

Bu çalışmada Nakliye App backend'inde (`apps/api`) hata yönetimi ve servis bağımlılıklarını inceledim. Dağınık Nest exception kullanımlarını `common/errors` altında topladım; `AppErrorCode`, `AppErrors` factory ve `GlobalAppExceptionFilter` ile tüm HTTP hatalarında `success`, `code`, `message` ve `statusCode` alanlarını standart hale getirdim. Kullanıcıya gösterilen mesajları değiştirmeden yalnızca kod ve cevap şeklini zenginleştirdim; böylece mevcut frontend ve unit testler bozulmadı.

Ayrıca bildirim yayınlama ve OpenAI hacim tahmini için `NotificationPublisherPort` ile `VolumeEstimationPort` tanımlayıp Nest provider token'ları ile bağladım. Offers, jobs, offer-threads ve ratings modüllerinde somut sınıf yerine port üzerinden bağımlılık verdim; testlerde mock sağlamayı kolaylaştırdım. Core modüllerdeki transaction ve lifecycle akışlarına dokunmadım; build ve 59 unit testin tamamının geçtiğini doğruladım.

---

*Rapor tarihi: Phase 7 uygulama tamamlandı.*
