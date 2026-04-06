# Amaç

Bu adımda Nest backend içinde yalnızca `auth`, `users` ve `roles` temeli kuruldu. Amaç, sonraki domain modüllerine geçmeden önce kimlik, oturum ve rol altyapısını sade ama gerçek şekilde ayağa kaldırmaktı.

# Bu Adımda Ne Kuruldu

- `auth` modülünde `login`, `refresh` ve `me` endpointleri kuruldu.
- `users` modülünde mevcut kullanıcıyı okuma ve profil döndürme temeli kuruldu.
- `roles` modülünde rol sabitleri, role guard ve geçici test endpointi kuruldu.
- Controller, service ve repository ayrımı geri getirildi; Prisma sorguları repository içinde tutuldu.

# Neden Önce Auth / Users / Roles Kuruldu

- Kimlik ve yetki zemini olmadan diğer modüllere geçmek erken olur.
- `vehicles`, `transport-requests` ve sonraki akışlar kullanıcı ve rol bağlamına ihtiyaç duyar.
- Bu yüzden önce giriş, token ve rol altyapısı netleştirildi.

# Auth Yaklaşımı

- Login hem `mail` hem `kullaniciAdi` ile çalışır.
- Şifre doğrulaması `bcryptjs.compare` ile yapılır.
- Access token Bearer header ile, refresh token body DTO ile taşınır.
- Refresh bu fazda stateless seçildi; DB'de token hash/rotation tutulmadı.
- Toplantı notu: İlk adımda sade tuttum; ileride revoke/rotation ihtiyacı olursa stateful yapıya geçilebilir.

# Role Yaklaşımı

- Resmi rol sabitleri `MUSTERI`, `NAKLIYECI`, `ADMIN` olarak tanımlandı.
- `RolesGuard`, access token içindeki `roles` alanını kullanır.
- `admin-probe` gerçek ürün endpointi değildir; guard davranışını elle doğrulamak için geçici test endpointidir.
- Ownership ve derin domain authorization bu fazda özellikle genişletilmedi.

# Katman Ayrımı

- Controller: HTTP giriş/çıkış ve guard kullanımı
- Service: auth akışı, token üretimi, profil ve rol orkestrasyonu
- Repository: Prisma sorguları
- DTO: login, refresh ve response sözleşmeleri
- Prisma sorguları controller içine alınmadı.

# Oluşturulan / Düzenlenen Dosyalar

- `apps/api/src/config/auth.config.ts`
- `apps/api/src/common/constants/role-names.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/common/decorators/roles.decorator.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/types/authenticated-user.type.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/repositories/users.repository.ts`
- `apps/api/src/modules/users/dto/user-profile-response.dto.ts`
- `apps/api/src/modules/roles/roles.controller.ts`
- `apps/api/src/modules/roles/roles.service.ts`
- `apps/api/src/modules/roles/repositories/roles.repository.ts`
- `apps/api/src/modules/roles/dto/role-response.dto.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/infrastructure/prisma/prisma.service.ts`
- `apps/api/.env.example`

# Henüz Bilinçli Olarak Yapılmayanlar

- `vehicles` modülü feature seviyesine çıkarılmadı.
- `transport-requests`, `offers`, `jobs`, `ratings`, `notifications` modüllerine geçilmedi.
- Registration endpoint yazılmadı.
- Public users CRUD veya admin kullanıcı yönetimi açılmadı.
- Role assignment CRUD yapılmadı.
- Refresh revoke, blacklist, rotation ve device/session yönetimi eklenmedi.
- Production-grade security hardening seviyesine çıkılmadı.

# Sonraki Adım

Sonraki mantıklı adım `vehicles` ve ardından `transport-requests` temelini kurmaktır. Bu geçişte mevcut auth ve role zemini korunmalı; ama bu fazda bilinçli olarak 3. faza geçilmedi.
