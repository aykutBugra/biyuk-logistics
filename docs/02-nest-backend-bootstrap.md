Backend:
cd C:\Users\aykut\nakliye-app
npm run dev:api
API health: http://localhost:4000/api/v1/health

frontend:
cd C:\Users\aykut\nakliye-app
npm run dev
http://localhost:3000/

# Amaç

Bu adımda `apps/api` tarafı tam feature backend olmaktan çıkarılıp Nest.js bootstrap iskeletine indirildi. Amaç, çalışan bir backend çekirdeği kurmak ve domain modülleri için temiz sınırlar bırakmaktı.

# Bu Adımda Ne Kuruldu

- `apps/api` içinde çalışan Nest bootstrap yapısı korundu ve sadeleştirildi.
- `GET /api/v1/health` endpoint'i bırakıldı.
- Global `ValidationPipe`, temel config katmanı ve DB'ye zorlamayan `PrismaService` iskeleti hazırlandı.
- `auth`, `users`, `roles`, `vehicles`, `transport-requests`, `offers`, `jobs`, `ratings`, `notifications` için sadece modül kabukları bırakıldı.

# Neden Bu Şekilde Kuruldu

- Bu adımın amacı feature geliştirmek değil, backend omurgasını güvenli şekilde ayırmaktı.
- Bootstrap seviyesinde kalmak, sonraki adımda auth ve domain akışlarını daha temiz kurmayı kolaylaştırır.
- Prisma erişimini lazy hale getirmek, canlı DB sorunu olsa bile backend'in health seviyesinde ayağa kalkmasını sağlar.

# Oluşturulan Klasörler ve Dosyalar

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/app.controller.ts`
- `apps/api/src/common/.gitkeep`
- `apps/api/src/config/app.config.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/infrastructure/prisma/prisma.module.ts`
- `apps/api/src/infrastructure/prisma/prisma.service.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/users/users.module.ts`
- `apps/api/src/modules/roles/roles.module.ts`
- `apps/api/src/modules/vehicles/vehicles.module.ts`
- `apps/api/src/modules/transport-requests/transport-requests.module.ts`
- `apps/api/src/modules/offers/offers.module.ts`
- `apps/api/src/modules/jobs/jobs.module.ts`
- `apps/api/src/modules/ratings/ratings.module.ts`
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/.env.example`

# Henüz Bilinçli Olarak Yapılmayanlar

- Auth akışları, JWT guard'ları ve RBAC tamamlanmadı.
- Request, offer, job, rating business logic'i yazılmadı.
- Repository, DTO ve controller katmanları feature seviyesinde kurulmadı.
- Prisma runtime bağlantı problemi bu adımda çözülmedi; sadece boot bağımlılığı kaldırıldı.
- Next.js tarafı HTTP API entegrasyonuna taşınmadı.

# Sonraki Adım

Sonraki adımda önce `auth`, `users` ve `roles` modülleri feature seviyesinde kurulmalı. Hemen ardından Prisma erişimi gerçek repository katmanına alınmalı ve web tarafı API client üzerinden Nest backend'i tüketmeye başlamalı.




