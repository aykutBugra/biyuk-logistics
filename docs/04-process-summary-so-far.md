# Amaç

Bu doküman, şimdiye kadar alınan kararları ve yapılan adımları kısa, net ve savunulabilir şekilde özetler. Amaç yeni karar üretmek değil, mevcut yönü toplantıda doğru anlatılabilir hale getirmektir.

# Şu Ana Kadarki Genel Akış

1. `apps/web` + `apps/api` yönü seçildi.  
   Ne yaptık: Frontend ve backend'i aynı repo içinde iki ayrı uygulama olarak konumladık.  
   Neden: UI ile backend kuralları birbirine karışmasın istedik.
2. `apps/api` bootstrap seviyesine indirildi.  
   Ne yaptık: Çalışan ama sade bir Nest çekirdeği bıraktık.  
   Neden: Feature yazmadan önce mimari omurgayı temizlemek gerekiyordu.
3. `auth/users/roles` foundation kuruldu.  
   Ne yaptık: Login, refresh, me ve temel role guard altyapısını ekledik.  
   Neden: Sonraki domain modüllerine geçmeden önce kimlik ve rol zemini gerekiyordu.

# Seçilen Mimari ve Nedenleri

## Next.js ve Nest.js ayrımı

- Ne yaptık: `apps/web` frontend, `apps/api` backend oldu.
- Neden yaptık: UI, auth, business logic ve veritabanı erişimi aynı katmanda yaşamasın istedik.
- Alternatif: Next-only fullstack veya Server Actions merkezli yapı.
- Neden seçmedik: Backend mantığını page/action seviyesine dağıtır ve ayrı backend hedefiyle çelişir.

## Monorepo

- Ne yaptık: Tek repo içinde `apps/web` ve `apps/api` workspaces kurduk.
- Neden yaptık: Frontend ve backend aynı ürün bağlamında birlikte sürümlensin ama ayrı uygulama olarak kalsın istedik.
- Alternatif: Ayrı repo.
- Neden seçmedik: Entegrasyon takibini ve ortak geliştirme akışını gereksiz zorlaştırır.

## Modüler monolith

- Ne yaptık: Backend'i modüller halinde tasarladık ama tek uygulama olarak bıraktık.
- Neden yaptık: Domain sınırlarını korurken mikroservis maliyetine girmek istemedik.
- Alternatif: Mikroservis.
- Neden seçmedik: Bu aşamada operasyonel maliyeti yüksek ve erken olurdu.

## REST API

- Ne yaptık: Backend sözleşmesini REST olarak kurduk.
- Neden yaptık: Next frontend ile en sade ve anlaşılır entegrasyon modeli bu.
- Alternatif: GraphQL.
- Neden seçmedik: Bu aşamada gereksiz sözleşme ve bakım yükü üretirdi.

# Elenen Alternatifler ve Nedenleri

- Next-only fullstack: Ayrı backend hedefiyle çelişirdi.
- Server Action merkezli backend: Business logic'i web katmanına fazla bağlardı.
- Mikroservis: Ekip ve ürün aşamasına göre erken ve pahalı olurdu.
- GraphQL-first: Bu aşamada ihtiyaçtan fazla karmaşıklık getirirdi.
- Controller içinde doğrudan Prisma: Service/repository ayrımını bozar, test edilebilirliği düşürürdü.
- Erken aşamada tam admin/users CRUD: Asıl hedef olan auth foundation'ı dağıtırdı.

# Bootstrap Aşamasında Ne Yapıldı

- Ne yaptık: `apps/api` health endpoint ile ayağa kalkan sade Nest çekirdeğine indirildi.
- Neden yaptık: Feature geliştirmeden önce çalışan ve temiz bir backend omurgası kurmak gerekiyordu.
- Alternatif: Mevcut ağır feature dosyalarını yerinde bırakmak.
- Neden seçmedik: Sistem tamamlanmış gibi görünür ama sınırlar net olmadığı için teknik borç üretirdi.

Bootstrap foundation içinde kurulan ana parçalar:
- `main.ts`, `app.module.ts`
- `config` temeli
- `PrismaModule` ve `PrismaService`
- `GET /api/v1/health`
- domain modülleri için klasör ve `module.ts` kabukları

Net anlamı: Bootstrap adımı geri gidiş değil, yanlış sırada büyümüş yapıyı kontrollü şekilde sadeleştirip foundation seviyesine çekme adımıydı.

# Neden Bazı Dosyalar Kaldırıldı

- Ne yaptık: Erken yazılmış controller, service, repository, dto ve guard dosyalarının bir kısmını kaldırdık veya sadeleştirdik.
- Neden yaptık: Gerçek auth, ownership ve modül sınırları netleşmeden bu dosyalar yapıyı olduğundan olgun gösteriyordu.
- Alternatif: Dosyaları yerinde bırakmak.
- Neden seçmedik: Sahte completeness üretir ve ileride refactor maliyetini artırır.

Bu silme işleminin mimari anlamı:
- Bu bir özellik kaybı değil, foundation dışı erken detayların temizlenmesidir.
- Daha az dosya burada daha zayıf mimari değil, daha net sınır anlamına gelir.

# Auth / Users / Roles Aşamasında Ne Yapıldı

## Auth

- Ne yaptık: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me` eklendi.
- Neden yaptık: Çalışan kimlik ve oturum akışı olmadan diğer modüllere geçmek sağlıklı olmazdı.
- Alternatif: `vehicles` ile başlamak.
- Neden seçmedik: Kullanıcı ve yetki zemini netleşmeden sonraki modüller erken olurdu.

## Users

- Ne yaptık: Mevcut kullanıcıyı okuma ve profil döndürme temeli kuruldu.
- Neden yaptık: `auth/me` ve sonraki profil akışları için sade kullanıcı okuma katmanı gerekiyordu.
- Alternatif: Tam users CRUD.
- Neden seçmedik: Bu fazın amacı kullanıcı yönetim paneli değil, auth temelini kurmaktı.

## Roles

- Ne yaptık: `GET /api/v1/roles/me` ve `GET /api/v1/roles/admin-probe` eklendi; role guard altyapısı kuruldu.
- Neden yaptık: Temel RBAC davranışını netleştirmek gerekiyordu.
- Alternatif: Ownership ve detaylı policy sistemi.
- Neden seçmedik: Bu faz için erken ve gereksiz genişleme olurdu.

## Refresh yaklaşımı

- Ne yaptık: Refresh token bu fazda stateless bırakıldı.
- Neden yaptık: Foundation aşaması için yeterince sade ve anlaşılır bir çözüm gerekiyordu.
- Alternatif: DB'de refresh hash/rotation tutmak.
- Neden seçmedik: Daha güvenli ama bu faz için gereksiz karmaşık olurdu.
- Not: İleride revoke/rotation ihtiyacı olursa stateful modele geçilebilir.

## Repository katmanı

- Ne yaptık: Prisma erişimini repository içinde tuttuk.
- Neden yaptık: Controller katmanını ince ve test edilebilir bırakmak istedik.
- Alternatif: Controller -> Prisma doğrudan erişim.
- Neden seçmedik: Katman ayrımını bozar ve sorguları dağınık hale getirir.

Foundation amaçlı kurulan ana modül ve dosya grupları:
- Bootstrap foundation: `main.ts`, `app.module.ts`, `config`, `infrastructure/prisma`
- Common auth/role foundation: `common/constants`, `decorators`, `guards`, `types`
- Auth foundation: `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, auth DTO'ları
- Users foundation: `users.service.ts`, `users.repository.ts`, kullanıcı profil DTO'su
- Roles foundation: `roles.controller.ts`, `roles.service.ts`, `roles.repository.ts`, role DTO'su

# Katman Ayrımı ve Sorumluluklar

- Controller: HTTP giriş/çıkış ve guard kullanımı
- Service: akış ve iş kuralı orkestrasyonu
- Repository: Prisma sorguları
- DTO: validation ve sözleşme
- Guard/Decorator: auth ve role zemini
- Web tarafı: UI + API client, doğrudan DB erişimi değil

# Şu An Hangi Aşamadayız?

Şu an foundation aşamasındayız.

- Mimari karar netleşti.
- Bootstrap çekirdeği hazır.
- Auth/users/roles temel akışı hazır.
- Ama `vehicles` ve sonraki domain modülleri henüz ürün seviyesinde tamamlanmadı.

# Henüz Bilinçli Olarak Yapılmayanlar

- `vehicles` feature seviyesine çıkarılmadı.
- `transport-requests`, `offers`, `jobs`, `ratings`, `notifications` yazılmadı.
- Registration yazılmadı.
- Public users CRUD açılmadı.
- Role assignment CRUD yapılmadı.
- Refresh revoke/rotation eklenmedi.
- Production-grade security hardening yapılmadı.
- Frontend tam API entegrasyonuna taşınmadı.

# Sonraki Adım ve Neden Henüz Geçilmedi

- Sonraki mantıklı adım: önce `vehicles`, sonra `transport-requests`.
- Neden henüz geçilmedi: Bu fazın hedefi auth/users/roles foundation idi.
- Alternatif: Domain modüllerine hemen geçmek.
- Neden seçmedik: Önce yeni auth ve role zemininin netleşmesi gerekiyordu; aksi halde sonraki modüller yanlış sırada büyürdü.

# Toplantıda Kullanılacak Kısa Savunma Metni

Projede önce yönü netleştirdik: `apps/web` frontend, `apps/api` backend olacak şekilde monorepo kurduk. Nest tarafını modüler monolith ve REST olarak seçtik; çünkü bu yapı ayrı backend hedefini destekliyor ve business logic'i UI katmanından ayırıyor.

Ardından bilinçli bir sadeleştirme yaptık: erken yazılmış ama sınırları net olmayan feature dosyalarını temizleyip çalışan bir bootstrap çekirdeği bıraktık. Sonra auth/users/roles foundation'ı kurduk; çünkü diğer domain modüllerine geçmeden önce kimlik, oturum ve rol zemininin net olması gerekiyordu. Bu geri gidiş değil, kontrollü foundation inşasıdır.
