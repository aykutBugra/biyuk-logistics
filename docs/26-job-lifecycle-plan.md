# Amaç

Bu adımda `offer acceptance` ile oluşan `Nakliye` kaydı, gerçek bir operasyon kaydı gibi yönetilebilir hale getirildi. Hedef; işi yalnızca oluşturmak değil, ayrı detail ekranı, resmi durum geçişleri ve taşıyıcının işi başlatıp tamamlayacağı akışı netleştirmekti.

# Bu Adımda Ne Değişti

- `Nakliye` modeli lifecycle’a uygun hale getirildi.
- acceptance sonrası oluşan job artık `NAKLIYE / BASLATILDI` değil `NAKLIYE / OLUSTURULDU` ile açılıyor.
- `jobs` modülüne detail, start ve complete yüzeyi eklendi.
- taşıyıcı için `/dashboard/nakliyelerim/[id]` ekranı açıldı.
- müşteri request detail ekranındaki job özeti, lifecycle zaman bilgileriyle genişletildi.
- job okumalarında request veya vehicle soft-delete filtreleri kaldırıldı; oluşmuş job geçmişi görünür kaldı.
- aktif job’a bağlı araç için minimum koruma olarak soft delete engeli eklendi.

# Nakliye Durum / Status Yaklaşımı

Bu fazda netleştirilen akış:

- acceptance sonrası job: `NAKLIYE / OLUSTURULDU`
- taşıyıcı işi başlatınca: `NAKLIYE / BASLATILDI`
- taşıyıcı işi tamamlayınca: `NAKLIYE / TAMAMLANDI`

İstek tarafı:

- acceptance sonrası request: `ISTEK / ANLASILDI`
- job complete sonrası request: `ISTEK / TAMAMLANDI`

Bu kararın nedeni:

- “iş oluştu” ile “iş gerçekten başladı” ayrıldı
- rating ve notification gibi sonraki fazlar için daha temiz event seti oluştu
- taşıyıcıya gerçek lifecycle aksiyonları açıldı

# Backend Tarafında Yapılanlar

Değişen ana dosyalar:

- [schema.prisma](/c:/Users/aykut/nakliye-app/apps/api/prisma/schema.prisma)
- [migration.sql](/c:/Users/aykut/nakliye-app/apps/api/prisma/migrations/20260417200000_add_job_lifecycle_timestamps_and_statuses/migration.sql)
- [offers.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/offers/offers.service.ts)
- [jobs.controller.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/jobs/jobs.controller.ts)
- [jobs.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/jobs/jobs.service.ts)
- [jobs.repository.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/jobs/repositories/jobs.repository.ts)
- [job-detail-response.dto.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/jobs/dto/job-detail-response.dto.ts)
- [job-list-item-response.dto.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/jobs/dto/job-list-item-response.dto.ts)
- [transport-requests.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/transport-requests.service.ts)
- [transport-requests.repository.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/repositories/transport-requests.repository.ts)
- [transport-request-job-summary-response.dto.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/transport-requests/dto/transport-request-job-summary-response.dto.ts)
- [vehicles.service.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/vehicles/vehicles.service.ts)
- [vehicles.repository.ts](/c:/Users/aykut/nakliye-app/apps/api/src/modules/vehicles/repositories/vehicles.repository.ts)

Eklenen / genişleyen endpointler:

- `GET /api/v1/jobs/my`
- `GET /api/v1/jobs/:jobId`
- `POST /api/v1/jobs/:jobId/start`
- `POST /api/v1/jobs/:jobId/complete`

Davranış:

- job detail hem `MUSTERI` hem `NAKLIYECI` için ownership filtresiyle okunur
- `start` ve `complete` sadece `NAKLIYECI`
- `start` yalnızca `NAKLIYE / OLUSTURULDU`
- `complete` yalnızca `NAKLIYE / BASLATILDI`
- `complete` sonrası request de `ISTEK / TAMAMLANDI` olur

Migration tarafında:

- `Nakliye.olusturmaTarihi` eklendi
- `Nakliye.baslangicTarihi` nullable hale geldi
- yeni durum kayıtları eklendi:
  - `NAKLIYE / OLUSTURULDU`
  - `NAKLIYE / TAMAMLANDI`
  - `ISTEK / TAMAMLANDI`
- eski dev job kayıtları `BASLATILDI` semantiğinden `OLUSTURULDU` semantiğine taşındı

# Frontend Tarafında Yapılanlar

Değişen ana dosyalar:

- [jobs.ts](/c:/Users/aykut/nakliye-app/apps/web/src/lib/api/jobs.ts)
- [nakliyelerim/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/nakliyelerim/page.tsx)
- [nakliyelerim/[id]/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/nakliyelerim/[id]/page.tsx)
- [isteklerim/[id]/page.tsx](/c:/Users/aykut/nakliye-app/apps/web/src/app/dashboard/isteklerim/[id]/page.tsx)
- [transport-requests.ts](/c:/Users/aykut/nakliye-app/apps/web/src/lib/api/transport-requests.ts)

Taşıyıcı tarafında:

- `Nakliyelerim` listesi artık detail ekranına gider
- yeni detail ekranında:
  - durum
  - rota
  - yük özeti
  - müşteri özeti
  - araç bilgisi
  - oluşturma / başlama / teslim zamanları
  - `Baslat` / `Tamamla` aksiyonları
  gösterilir

Müşteri tarafında:

- request detail ekranındaki job summary genişletildi
- ayrı müşteri job route açılmadı
- müşteri aynı request detail içinde:
  - job durumu
  - anlaşılan fiyat
  - araç plakası
  - taşıyıcı özeti
  - kayıt / başlangıç / teslim zamanları
  görebilir

# Vehicle / Request Koruma Kararları

Bu fazda iki önemli koruma korundu veya eklendi:

- request tarafında job oluşmuş kayıtlar zaten update/delete alamıyor
- vehicle tarafında aktif işe bağlı araç artık soft-delete edilemiyor

Vehicle tarafında update blokajı bu fazda genişletilmedi. Minimum güvenli çizgi olarak delete koruması eklendi.

# Test / Kontrol Sonuçları

Çalıştırılan komutlar:

- `npm run prisma:generate` (`apps/api`)
- `npx prisma migrate dev` (`apps/api`)
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Sonuç:

- Prisma client generate geçti
- migration uygulandı
- API build geçti
- API lint geçti
- Web build geçti
- Web lint geçti

# Bilinçli Olarak Yapılmayanlar

- `cancel` endpoint
- rating / puanlama akışı
- notification / event yayını
- belge veya fotoğraf yükleme
- canlı konum / rota takibi
- müşteri onaylı completion
- gelişmiş filtreleme / arama / sayfalama
- admin moderasyon
- genel UI redesign
- PrimeReact veya yeni component kütüphanesi

# Sonraki Mantıklı Adım

Bir sonraki mantıklı faz:

- rating açılacaksa onu `NAKLIYE / TAMAMLANDI` sonrasına bağlamak
- notification açılacaksa artık stabil event seti üzerinden kurgulamak
- gerekiyorsa ayrı `cancel` politikası için yeni karar fazı açmak

Bu noktadan sonra ratings ve notifications artık daha sağlam bir domain zemini üstüne kurulabilir.
