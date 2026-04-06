# Amaç

Next.js tarafını yalnızca frontend yapmak, business logic ve veritabanı erişimini ayrı bir Nest.js backend içinde toplamak.

# Seçilen Mimari

- Monorepo hedefi: `apps/web` + `apps/api`
- `apps/web` = Next.js UI ve API client
- `apps/api` = Nest.js modüler monolith REST API
- Prisma ve PostgreSQL erişimi yalnızca backend tarafında

# Neden Bu Mimari

- Modüler monolith, bu domain için düşük operasyon maliyetiyle net modül sınırları sağlar.
- REST API, Next frontend ile ayrı backend arasında en sade ve anlaşılır sözleşmedir.
- Nest.js, guard, validation, DTO ve modül yapısıyla iş kurallarını UI'dan ayırmak için uygundur.
- Next içinde Server Actions merkezli gitmemek, business logic'in page dosyalarına dağılmasını engeller.

# Elenen Alternatifler

- Next-only fullstack: ayrı backend hedefiyle çelişir.
- Server Action merkezli yaklaşım: web'e aşırı bağlar, tekrar kullanım alanını daraltır.
- GraphQL-first: bu aşamada gereksiz sözleşme ve bakım maliyeti üretir.
- Mikroservis: erken aşama için operasyonel maliyeti yüksek.
- Controller -> Prisma doğrudan erişim: servis/repository ayrımını bozar.

# Backend Modülleri

- `auth`
- `users`
- `roles`
- `vehicles`
- `transport-requests`
- `offers`
- `jobs`
- `ratings`
- `notifications`

# Katmanlar ve Sorumluluklar

- `controller`: HTTP giriş noktası ve DTO binding
- `service`: business logic, akış ve sahiplik kontrolleri
- `repository`: Prisma sorguları ve DB erişimi
- `dto`: request/response kontratı ve validation
- `guard`: authentication ve coarse-grained authorization
- `common`: decorator, guard, filter, shared type

# Next.js ve Nest.js Ayrımı

- Next.js içinde Prisma importu ve business logic bulunmamalı.
- Next.js tarafı sadece sayfa, component, form ve HTTP API çağrısı yapmalı.
- Nest.js tarafı auth, validation, role kontrolü, repository ve iş kuralı katmanı olmalı.

# Veritabanı Entegrasyon Yaklaşımı

- PostgreSQL ve Prisma şeması korunur.
- Prisma client backend tarafında `PrismaModule` ve `PrismaService` ile yönetilir.
- Mevcut tablo adları backend içinde kalır; dış API kontratı resource odaklı tutulur.

# Geliştirme Sırası

1. Workspace yapısını netleştir.
2. Nest çekirdeğini, config, validation ve Prisma altyapısını kur.
3. `users`, `roles`, `auth` modüllerini oturt.
4. `vehicles` ve `transport-requests` modüllerini bağla.
5. `offers`, `jobs`, `ratings` akışlarını tamamla.
6. `notifications` modülünü gerçek kanal ihtiyacına göre derinleştir.
7. Web tarafını tamamen HTTP API client üzerinden konuştur.

# Toplantıda Verilecek Kısa Savunma Cevabı

Bu projede Next.js'i frontend, Nest.js'i backend olarak ayırıyoruz çünkü auth, validation ve iş kuralları UI katmanında yaşamamalı. Modüler monolith + REST yaklaşımı, bugünkü ekip ve ürün ihtiyacı için yeterince sade ama yarın büyümeye de açık bir temel veriyor.
