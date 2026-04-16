# İşyeri Eğitimi 8. ve 9. Hafta Çalışma Planı

Bu dosya, `nakliye-app` projesi kapsamında 8. ve 9. haftalık raporları doldurmayı kolaylaştırmak için hazırlanmıştır. İçerik, proje yönünün netleştirilmesi, backend mimarisinin kurulması, veritabanı hazırlığı ve auth altyapısının çalışır hale getirilmesi üzerine odaklanır.

Kullanım notu:
- Bu içerik iki hafta için ortak teknik iskelet olarak kullanılabilir.
- Metinler Word şablonundaki `Gerçekleştirilen faaliyetler`, `Çözümler ve/veya kazanımlar` ve `Bir sonraki hafta için planlanan çalışmalar` alanlarına uygun biçimde hazırlanmıştır.

## Hafta 8

Tarih: 30 Mart - 3 Nisan 2026

Tema: Proje yönünü netleştirme, backend mimarisi ve veritabanı hazırlığı

#### Gerçekleştirilen faaliyetler
- Proje için frontend ve backend ayrımı netleştirilerek `apps/web` ve `apps/api` yapısı üzerine monorepo çalışma düzeni benimsendi.
- Backend tarafında modüler monolith ve REST API yaklaşımı seçildi; controller, service ve repository katmanlarının sorumlulukları tanımlandı.
- `apps/api` içinde çalışan NestJS bootstrap çekirdeği kuruldu; health endpoint, global validation, config yapısı ve Prisma altyapısı hazırlandı.
- PostgreSQL ve Prisma üzerinden temel veritabanı yapısı oluşturuldu; kullanıcı, rol, araç, istek, teklif, nakliye ve puanlama alanlarını kapsayan şema ile migration yapısı hazır hale getirildi.

#### Çözümler ve/veya kazanımlar
- Frontend ile backend sorumluluklarının ayrılması sayesinde iş kurallarının arayüz katmanına dağılması engellendi ve daha sürdürülebilir bir proje yönü belirlendi.
- Backend çekirdeği çalışır hale getirilerek sonraki modüllerin bu omurga üzerinde kontrollü biçimde geliştirilmesi için uygun zemin oluşturuldu.
- Veritabanı tarafında temel tablolar ve ilişkiler netleştiği için kullanıcı yönetimi ve auth akışına geçiş için gerekli altyapı hazırlanmış oldu.

#### Bir sonraki hafta için planlanan çalışmalar
- Sonraki hafta `auth`, `users` ve `roles` modülleri gerçek feature seviyesine çıkarılacak.
- `register`, `login`, `me` ve `refresh` akışları backend tarafında çalışır hale getirilecek.
- JWT tabanlı kimlik doğrulama ve rol tabanlı temel yetki kontrolü aktif edilerek giriş altyapısı tamamlanacak.

## Hafta 9

Tarih: 6-10 Nisan 2026

Tema: Backend auth altyapısını kurma ve giriş akışlarını çalışır hale getirme

#### Gerçekleştirilen faaliyetler
- `auth`, `users` ve `roles` modülleri feature seviyesinde düzenlenerek controller, service ve repository ayrımı net biçimde kuruldu.
- `login`, `refresh`, `me` ve rol sorgulama endpointleri backend tarafında çalışır hale getirildi; giriş işlemi hem mail hem kullanıcı adı ile desteklendi.
- `register` endpoint'i eklenerek şifre hashleme, varsayılan rol atama, duplicate mail ve duplicate kullanıcı adı kontrolü ile DTO validation kuralları tanımlandı.
- JWT strategy, `JwtAuthGuard` ve `RolesGuard` üzerinden access token doğrulama ve temel role-based erişim altyapısı oluşturuldu.

#### Çözümler ve/veya kazanımlar
- `register -> login -> me -> refresh` zinciri tutarlı bir auth halkasına dönüştü ve backend tarafında gösterilebilir seviyede tamamlandı.
- Hatalı giriş ve çakışan kullanıcı kayıtları için hata davranışları netleştirildi; duplicate kayıtlar `409`, geçersiz login/refresh durumları `401` olarak standartlaştırıldı.
- Lint ve build doğrulamaları ile temel endpoint testlerinin geçmesi, auth çekirdeğinin teknik olarak oturduğunu ve sonraki modüllere geçiş için uygun hale geldiğini gösterdi.

#### Bir sonraki hafta için planlanan çalışmalar
- Web tarafındaki login ve register formları yeni API sözleşmesine bağlanacak.
- Auth zemini korunarak `vehicles` ve ardından `transport-requests` modüllerine geçiş planlanacak.
- Giriş ve yetki altyapısı üzerinden gerçek domain akışlarının backend tarafında genişletilmesi hedeflenecek.
