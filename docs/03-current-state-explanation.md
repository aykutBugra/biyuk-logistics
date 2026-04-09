# Amaç

Bu doküman, mevcut yapının neden bu hale getirildiğini kısa ve teknik olarak doğru şekilde açıklar. Amaç yeni mimari önermek değil, şu anki durumu netleştirmektir.

# Şu Anki Yapı

- Karar: Repo iki uygulamaya ayrılmış durumda: `apps/web` ve `apps/api`.
- Sebep: Kök workspace yapısı bunu çalışma modeli olarak tanımlar; frontend ve backend ayrı süreçler olarak çalışır.
- Karar: `apps/web` çalışan Next.js frontend'dir.
- Sebep: Sayfalar, bileşenler ve HTTP API istemcisi burada bulunur.
- Karar: `apps/api` çalışan Nest.js backend çekirdeğidir.
- Sebep: Şu an `GET /api/v1/health` endpoint'i ile ayağa kalktığı doğrulanmıştır.

# Web ve API Ayrımı

- Karar: `apps/web` yalnızca UI, sayfa, form ve API tüketim katmanıdır.
- Sebep: Web tarafında doğrudan veritabanı erişimi yerine `apps/web/src/lib/api/api-client.ts` üzerinden HTTP çağrısı hedeflenmiştir.
- Karar: `apps/api` config, validation, Prisma altyapısı ve ileride business logic'in evi olacak.
- Sebep: `apps/api/src/main.ts`, `apps/api/src/app.module.ts` ve `apps/api/src/infrastructure/prisma` bu çekirdeği oluşturur.
- Karar: Veritabanı erişimi hedef olarak backend tarafında tutulur.
- Sebep: Frontend ile backend sorumlulukları karışmasın ve iş kuralları UI içine dağılmasın diye bu ayrım seçildi.

# Neden Dosyalar Kaldırıldı

- Karar: Eski feature seviyesindeki birçok controller, service, repository, dto ve guard dosyası kaldırıldı veya sadeleştirildi.
- Sebep: Bu dosyalar gerçek auth, ownership ve modül akışları kurulmadan önce fazla erken detay üretiyordu.
- Karar: Yarım feature katmanları korunmadı.
- Sebep: Bu dosyalar kaldığında sistem tamamlanmış gibi görünür, ama sınırlar net olmadığı için teknik borç üretir.

# Bunun Mimari Açıdan Anlamı

- Karar: Bu değişiklik geri gidiş değil, mimari sadeleştirmedir.
- Sebep: Amaç özellikleri azaltmak değil, yanlış yerde duran yarım katmanları temizleyip sağlam çekirdeğe dönmektir.
- Karar: Daha az dosya burada daha zayıf yapı anlamına gelmez.
- Sebep: Asıl kazanım, sorumlulukların daha net ayrılması ve sahte karmaşıklığın kaldırılmasıdır.

# Eski Yapıdan Ayrışan Noktalar

- Karar: Yeni yapı frontend ve backend sorumluluklarını daha net ayırır.
- Sebep: Önceki yapıda backend benzeri sorumluluklar daha dağınık görünüyordu; şimdi `apps/web` ve `apps/api` sınırı daha açık.
- Karar: Yeni yapı feature-complete görünümden foundation seviyesine çekildi.
- Sebep: Önce çok sayıda feature dosyası vardı; şimdi daha az dosya var ama hangi katmanın ne işe yaradığı daha net.

# Risk Var mı?

- Karar: Evet, sınırlı kısa vadeli risk var; ama kontrollü.
- Sebep: Backend çekirdeği çalışıyor olsa da gerçek auth ve domain endpoint'leri henüz yeniden kurulmuş değil.
- Karar: Mimari açıdan orta-uzun vadeli risk azaldı.
- Sebep: Yanlış sınırlar üzerinde büyümek yerine çekirdek sadeleştirildi ve doğru sıraya dönüldü.
- Karar: En büyük risk beklenti hatasıdır.
- Sebep: Ekip bu yapıyı feature-complete backend sanarsa mevcut aşamayı yanlış değerlendirir.

# Şu An Hangi Aşamadayız?

- Karar: Şu an bootstrap / foundation aşamasındayız.
- Sebep: Health endpoint çalışıyor, config ve validation hazır, Prisma iskeleti hazır; ama auth ve domain akışları henüz feature seviyesinde değil.
- Karar: Çalışan çekirdek var, ürün backend'i henüz yok.
- Sebep: Temel omurga hazırlandı, iş kuralları ve gerçek modül akışları sonraki adıma bırakıldı.

# Sonraki Adım

- Karar: En mantıklı sıradaki iş `auth`, `users` ve `roles` modüllerini feature seviyesinde kurmaktır.
- Sebep: Kimlik, yetki ve kullanıcı zemini netleşmeden diğer iş akışlarını sağlıklı kurmak erken olur.
- Karar: Sonraki sıra `vehicles` ve `transport-requests`, ardından `offers`, `jobs` ve `ratings` olmalıdır.
- Sebep: Domain akışları bu bağımlılık sırasıyla daha güvenli şekilde kurulabilir.

# Toplantıda Kullanılacak Kısa Açıklama

Repo artık iki ayrı uygulamaya ayrılmış durumda: `apps/web` frontend, `apps/api` backend çekirdeği. API tarafında yarım ve erken feature katmanları temizlenip çalışan bir bootstrap temel bırakıldı; bu geri gidiş değil, auth ve domain modüllerini doğru sınırlar üzerinde yeniden kurmak için yapılan mimari sadeleştirmedir.



