# Amaç

Bu adımın amacı, `apps/api` içindeki auth/users/roles temelini toplantıda gösterilebilir bir auth halkasına çıkarmaktır. Hedef kapsam `register -> login -> me -> refresh` akışını gerçekten çalışır, tutarlı ve açıklanabilir hale getirmektir.

# Bu Adımda Ne Kuruldu

- `POST /api/v1/auth/register` eklendi.
- Public register için `RegisterDto` ve validation kuralları eklendi.
- Register sırasında şifre hash üretimi ve kullanıcı + rol atama akışı kuruldu.
- Login akışı aynı sözleşmeyi koruyacak şekilde temizlendi.
- `me` ve `refresh` akışları korunup register ile aynı auth zemini üzerinde bırakıldı.
- Duplicate `mail` ve duplicate `kullaniciAdi` durumları için açık `409 Conflict` davranışı eklendi.

# Register Yaklaşımı

Register body alanları:

- `ad`
- `soyad`
- `mail`
- `kullaniciAdi`
- `telefonNumarasi?`
- `password`
- `role?`

Kararlar:

- Public register yalnızca `MUSTERI` veya `NAKLIYECI` başlangıç rolünü kabul eder.
- `role` gönderilmezse varsayılan rol `MUSTERI` olur.
- `telefonNumarasi` opsiyonel bırakılmıştır.
- `mail` normalize edilir ve küçük harfe çevrilir.
- `kullaniciAdi` normalize edilir ve küçük harfe çevrilir.
- `password` `bcryptjs.hash(..., 12)` ile hashlenir.

Register sonrası davranış:

- Bu adımda kullanıcı oluşturulduktan sonra doğrudan token çifti döndürülmesi seçildi.
- Yani register response'u login response'u ile aynı şekildedir: `accessToken`, `refreshToken`, `tokenType`, `user`.

Gerekçe:

- Toplantı demosunda `register -> me` ve `register -> refresh` zinciri doğrudan gösterilebilir.
- Ayrı bir ek login zorunluluğu eklenmediği için demo akışı kısa ve nettir.
- Controller seviyesinde ek karmaşa oluşmadan mevcut auth sözleşmesi tekrar kullanılmış olur.

# Login Yaklaşımı

- `POST /api/v1/auth/login` mail veya `kullaniciAdi` ile çalışmaya devam eder.
- Kullanıcı bulunamazsa veya şifre yanlışsa aynı hata verilir: `401 Unauthorized` ve `Invalid credentials.` mesajı.
- Login response'u sade bırakılmıştır: token çifti + kullanıcı profili.
- Response içindeki `user` alanı `sifreHash` içermez; sadece profil için gerekli alanlar döner.

# Varsayılan Rol Kararı

- Public register varsayılan olarak `MUSTERI` ile başlar.
- Self-register üzerinden `ADMIN` atanmasına izin verilmez.
- `Rol` tablosunda istenen rol yoksa sistem auto-seed yapmaz.
- Bu durumda register açık bir `500 Internal Server Error` döner ve mesaj olarak ilgili rolün yapılandırılmadığını söyler.

Bu karar bilinçlidir:

- Startup sırasında gizli veri mutasyonu yapılmaz.
- Auth kodu ile operasyon/seed süreci birbirine karıştırılmaz.
- Toplantıda “rol kaydı yoksa ne olur?” sorusuna net cevap verilebilir: register bilinçli olarak başarısız olur.

# Katman Ayrımı

- `AuthController` yalnızca HTTP giriş/çıkış katmanıdır.
- `AuthService` register/login/refresh/me orkestrasyonunu yönetir.
- `UsersService` kullanıcı oluşturma ve kullanıcı okuma akışını toplar.
- `UsersRepository` Prisma okuma/yazma ve transaction işlemlerini yapar.
- `RolesService` rol çözümleme ve role-name normalizasyonunu yapar.
- `RolesRepository` rol sorgularını taşır.
- Prisma doğrudan controller içine alınmamıştır.

# Oluşturulan / Düzenlenen Dosyalar

Oluşturulan dosyalar:

- `apps/api/src/modules/auth/dto/register.dto.ts`
- `docs/05-register-login-ready.md`

Düzenlenen dosyalar:

- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/dto/login.dto.ts`
- `apps/api/src/modules/auth/dto/refresh.dto.ts`
- `apps/api/src/modules/roles/repositories/roles.repository.ts`
- `apps/api/src/modules/roles/roles.service.ts`
- `apps/api/src/modules/users/repositories/users.repository.ts`
- `apps/api/src/modules/users/users.service.ts`

# Validation ve Hata Davranışı

Validation:

- `RegisterDto` içinde string alanlar trimlenir.
- `mail` için email doğrulaması vardır.
- `password` için minimum uzunluk kontrolü vardır.
- `role` alanı yalnızca `MUSTERI` veya `NAKLIYECI` kabul eder.
- `telefonNumarasi` boş string gelirse `undefined` olarak değerlendirilir.

Hata davranışı:

- Hatalı register input: `400 Bad Request`
- Duplicate `mail`: `409 Conflict`
- Duplicate `kullaniciAdi`: `409 Conflict`
- Hatalı login: `401 Unauthorized`
- Tokensız `me`: `401 Unauthorized`
- Geçersiz refresh token: `401 Unauthorized`
- Eksik rol kaydı: `500 Internal Server Error`

Soft delete kararı:

- `mail` ve `kullaniciAdi` alanları yeniden kullanılmaz.
- Soft-deleted kullanıcılar için de duplicate kontrolü korunur.
- Restore veya re-claim davranışı bu adıma alınmamıştır.

# Henüz Bilinçli Olarak Yapılmayanlar

- `vehicles` modülüne geçilmedi.
- `transport-requests`, `offers`, `jobs`, `ratings`, `notifications` modüllerine geçilmedi.
- Logout, revoke, blacklist, device session yapılmadı.
- Email verification, forgot password, reset password yapılmadı.
- Public users CRUD veya admin user management yapılmadı.
- Startup seed/auto-bootstrap mutasyonu eklenmedi.
- Frontend tarafında büyük auth entegrasyonu yapılmadı.
- Production-grade tam hardening hedeflenmedi.

# Test Sonuçları

Komut doğrulamaları:

- `npm run lint:api` geçti.
- `npm run build:api` geçti.

Canlı endpoint doğrulamaları lokal API süreci üzerinde yapıldı:

- `GET /api/v1/health` -> `200`
- `POST /api/v1/auth/register` geçerli `MUSTERI` verisi ile -> `201`
- `POST /api/v1/auth/register` geçerli `NAKLIYECI` verisi ile -> `201`
- `POST /api/v1/auth/register` role alanı olmadan -> `201` ve varsayılan rol `MUSTERI`
- `POST /api/v1/auth/register` duplicate `mail` -> `409`
- `POST /api/v1/auth/register` duplicate `kullaniciAdi` -> `409`
- `POST /api/v1/auth/register` invalid input -> `400`
- `POST /api/v1/auth/login` mail ile -> `200`
- `POST /api/v1/auth/login` `kullaniciAdi` ile -> `200`
- `POST /api/v1/auth/login` yanlış şifre ile -> `401`
- `GET /api/v1/auth/me` token ile -> `200`
- `GET /api/v1/auth/me` tokensız -> `401`
- `POST /api/v1/auth/refresh` geçerli refresh ile -> `200`
- `POST /api/v1/auth/refresh` bozuk token ile -> `401`
- `GET /api/v1/roles/me` token ile -> `200`

Ek doğrulama:

- Lokal veritabanında başlangıçta `MUSTERI` rol kaydı yokken `POST /api/v1/auth/register` çağrısı `500` ile başarısız oldu.
- Bu, seçilen tasarımla uyumludur ve “rol kaydı yoksa açık hata ver” kararını doğruladı.
- Başarı senaryoları ise lokal veritabanına gerekli rol satırları eklendikten sonra tekrar doğrulandı.

# Sonraki Adım

Bir sonraki mantıklı adım, auth akışını frontend ile hafif seviyede bağlamak ve `apps/web` içinde gerçek login/register form submit akışını yeni API sözleşmesine geçirmek olacaktır. Bu yapılırken yine auth kapsamı korunmalı; domain modüllerine ancak bu sözleşme frontend tarafından kullanılır hale geldikten sonra geçilmelidir.
