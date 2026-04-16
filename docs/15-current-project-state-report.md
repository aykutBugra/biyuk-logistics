# Mevcut Proje Durum Raporu

## Amaç

Bu raporun amacı, `C:\Users\aykut\nakliye-app` reposunun şu anki teknik durumunu netleştirmektir. Hedef, sonraki faza geçmeden önce hangi parçaların gerçekten çalıştığını, hangi parçaların iskelet seviyesinde kaldığını ve mantıksal sıradaki en doğru adımın ne olduğunu savunulabilir şekilde ortaya koymaktır.

Bu rapor hazırlanırken repo içeriği, `docs` klasöründeki faz notları ve mevcut kaynak kod birlikte incelendi. Ek doğrulama olarak:

- `npm run lint:api` geçti.
- `npm run build:api` geçti.
- `npm run build:web` geçti.
- `npm run lint:web` geçmedi.
- Web lint hatası `apps/web/src/app/iletisim/page.tsx` dosyasındaki React immutability ihlalinden geliyor.

## Genel Repo Yapısı

Repo kökte iki workspace içeren bir monorepo olarak kurulmuş:

- `apps/web`: Next.js 16 tabanlı frontend.
- `apps/api`: NestJS 11 tabanlı backend.
- `docs`: alınan kararların, fazların ve öğrenme notlarının tutulduğu süreç hafızası.

Kök `package.json` bu ayrımı doğrudan tanımlıyor:

- `dev:web` yalnızca web uygulamasını çalıştırıyor.
- `dev:api` yalnızca API uygulamasını çalıştırıyor.
- `build`, `lint` ve `prisma:generate` workspace bazlı yönetiliyor.

`apps/api/prisma` altında gerçek Prisma şeması ve migration geçmişi var. Şema yalnızca auth tablolarını değil, gelecekteki domain tablolarını da içeriyor:

- `Kullanici`, `Rol`, `KullaniciRol`
- `Arac`, `AracKutuphanesi`
- `Istek`
- `Teklif`
- `Nakliye`
- `PuanTanimlari`, `Puanlama`
- `Durum`

Önemli nokta şu: veritabanı şeması domain olarak geniş, fakat uygulama kodu şu anda bu şemanın yalnızca küçük bir bölümünü gerçekten kullanıyor.

`docs` klasörü faz akışını kabaca şu sırayla anlatıyor:

- mimari yön seçimi
- Nest bootstrap
- auth/users/roles foundation
- register/login hazır hale gelmesi
- web tarafında minimal auth entegrasyonu
- kullanıcı listeleme örneği ve sonraki adım tartışmaları

Yani repo sadece kod değil; aynı zamanda karar geçmişi de içeriyor. Bu güçlü bir durum, ama bazı dokümanların teorik veya kısmen eski kalmış olabileceği de görülüyor.

## Web ve API Ayrımı

`apps/web + apps/api` ayrımı bilinçli bir mimari tercih. Bunun temel gerekçeleri şunlar:

- UI katmanı ile business logic katmanı birbirine karışmıyor.
- Veritabanı erişimi web tarafına taşınmıyor.
- Backend kuralları Next sayfalarının içine dağılmıyor.
- Ayrı client ihtiyacı doğarsa aynı backend yeniden kullanılabiliyor.
- Monorepo sayesinde iki uygulama aynı ürün bağlamında birlikte geliştirilebiliyor.

NestJS backend’in ayrı tutulmasının temel nedeni de aynı çizgi:

- auth
- validation
- guard
- DTO sözleşmeleri
- role kontrolü
- Prisma erişimi
- iş kuralı orkestrasyonu

gibi konuların frontend içinde yaşamaması istenmiş.

Bu backend neden modüler monolith olarak seçilmiş?

- Tek process ile düşük operasyon maliyeti sağlıyor.
- Buna rağmen domain sınırlarını modüllerle ayırıyor.
- Mikroservis erken karmaşıklığını getirmiyor.
- `auth`, `users`, `roles`, `vehicles`, `transport-requests`, `offers`, `jobs`, `ratings`, `notifications` gibi sınırları baştan isimlendiriyor.

Bu backend neden REST API olarak tutulmuş?

- `apps/web` ile `apps/api` arasında en sade sözleşme bu.
- Öğrenmesi, debug etmesi ve elle test etmesi kolay.
- Şu aşamada GraphQL gibi ek altyapı ve bakım yükü gerektirmiyor.
- Auth akışları için Bearer token + JSON request/response modeli yeterli.

Kısacası:

- repo seviyesi: monorepo
- backend seviyesi: modüler monolith
- frontend/backend iletişimi: REST

Bu üç karar birbiriyle tutarlı.

## Şu Ana Kadar Tamamlanan Fazlar

Şu ana kadar tamamlanmış görünen fazlar şunlar:

1. Monorepo yönü netleştirildi.
`apps/web` ve `apps/api` workspaces kuruldu, kök script yapısı buna göre düzenlendi.

2. Backend mimari kararı alındı.
Next.js yalnızca frontend olacak, NestJS ayrı backend olacak kararı repo ve dokümanlarda tutarlı şekilde yerleşmiş durumda.

3. Nest bootstrap fazı tamamlandı.
`main.ts`, `app.module.ts`, `app.controller.ts`, config yapısı, global `ValidationPipe`, CORS, `PrismaModule` ve `GET /api/v1/health` omurgası kuruldu.

4. Prisma ve PostgreSQL temeli kuruldu.
Gerçek Prisma şeması ve migration geçmişi var. Domain tabloları şemada tanımlı.

5. `auth / users / roles` foundation fazı tamamlandı.
Controller, service, repository, DTO, guard ve JWT strategy katmanları gerçek kod olarak kuruldu.

6. `register -> login -> me -> refresh` auth halkası backend tarafında çalışır seviyeye getirildi.
Kod ve dokümanlar bu halkayı destekliyor; `lint:api` ve `build:api` de geçiyor.

7. Web tarafında minimal auth entegrasyonu başladı ve belirli ölçüde tamamlandı.
`/login` ve `/register` sayfaları backend’e istek atıyor, token verisini `localStorage` içine yazıyor. `/hakkimizda` sayfası da token ile `/users` endpoint’inden veri çekiyor.

Henüz tamamlanmamış ana faz ise ilk gerçek domain modülü fazı. Yani ürünün asıl nakliye iş akışı daha başlamamış durumda.

## Backend Tarafında Mevcut Durum

Backend tarafında gerçekten aktif olan çekirdek şu dosyalara dayanıyor:

- `src/main.ts`
- `src/app.module.ts`
- `src/app.controller.ts`
- `src/config/*`
- `src/infrastructure/prisma/*`
- `src/modules/auth/*`
- `src/modules/users/*`
- `src/modules/roles/*`
- `src/common/constants`, `decorators`, `guards`, `types`

Aktif olarak uygulamaya bağlanmış modüller yalnızca şunlar:

- `PrismaModule`
- `RolesModule`
- `UsersModule`
- `AuthModule`

Bu nokta kritik. Çünkü `vehicles`, `transport-requests`, `offers`, `jobs`, `ratings`, `notifications` klasörleri repo içinde var ama `AppModule` içine import edilmedikleri için runtime’da aktif değiller.

Şu an gerçekten görülen endpoint yüzeyi 8 uç noktadan oluşuyor:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/roles/me`
- `GET /api/v1/roles/admin-probe`
- `GET /api/v1/users`

Bootstrap aşamasında yapılan işler kod seviyesinde net:

- Nest uygulamasının ayağa kaldırılması
- global prefix olarak `api/v1` kullanılması
- global `ValidationPipe`
- CORS ayarı
- environment okuma yapısı
- lazy çalışan `PrismaService`
- health endpoint

Prisma tarafında ayrıca önemli iki gerçek var:

- şema domain olarak geniş hazırlandı
- seed veya otomatik bootstrap akışı görünmüyor

Bu yüzden register akışının sağlıklı çalışması için `Rol` tablosunda beklenen rollerin önceden var olması gerekiyor. Kod da bunu özellikle açık hata ile bekliyor.

Backend kalite durumu şu anda şöyle okunabilir:

- auth çekirdeği gerçek
- endpoint sözleşmeleri gerçek
- Prisma erişimi gerçek
- derleme ve lint doğrulaması backend tarafında temiz

Bu yüzden backend tarafı için doğru ifade şudur:

Tam ürün backend’i değil, ama gerçek çalışan bir auth merkezli temel backend.

## Frontend Tarafında Mevcut Durum

Frontend tarafı Next.js 16 App Router üzerinde kurulmuş. Ana yapı şu kadar:

- `src/app`: sayfalar
- `src/components`: küçük tekrar kullanılabilir bileşenler
- `src/lib/api/api-client.ts`: backend ile konuşan HTTP istemcisi
- `src/proxy.ts`: gelecekte auth yönlendirmesi için bırakılmış merkezi kanca

Gerçekten çalışan görünen frontend parçaları şunlar:

- ana sayfa
- navbar
- login formu
- register formu
- kullanıcı listesini çeken `/hakkimizda` sayfası
- API client katmanı

`api-client.ts` tarafında önemli bir temel var:

- `NEXT_PUBLIC_API_BASE_URL` destekleniyor
- varsayılan URL `http://localhost:4000/api/v1`
- Bearer token gönderilebiliyor
- backend hata mesajı ayrıştırılabiliyor

Web tarafında auth entegrasyonu var, ama hâlâ çok minimal:

- başarılı login sonrası `alert`
- başarılı register sonrası `alert`
- auth verisi `localStorage["nakliye.auth"]` içine yazılıyor
- global auth context yok
- session restore mantığı yok
- logout yok
- navbar auth durumuna göre değişmiyor
- protected route enforcement yok
- refresh token client tarafında aktif kullanılmıyor

`/hakkimizda` sayfası, login sonrası oluşan token ile `/users` endpoint’ini çağırıyor. Yani frontend tarafında artık en az bir auth-protected veri çekme örneği var.

Ama dashboard tarafı ürün akışı seviyesinde hazır değil. Şu sayfalar sadece placeholder:

- `/dashboard/acik_istekler`
- `/dashboard/arac_ekle`
- `/dashboard/araclarim`
- `/dashboard/istek_ekle`
- `/dashboard/isteklerim`
- `/dashboard/paun_ver`
- `/dashboard/profil`
- `/dashboard/puanlarim`
- `/dashboard/teklif_ver`
- `/dashboard/tekliflerim`

Ek bir dikkat noktası da `apps/web/src/app/iletisim/page.tsx`:

- ürün sayfası gibi durmuyor
- küçük bir React state deneme dosyası görünümünde
- `lint:web` yalnızca bu dosya yüzünden kırılıyor

Bu yüzden frontend için savunulabilir ifade şudur:

Web tarafında temel ekranlar ve minimal auth bağlantısı var, fakat uygulamanın büyük kısmı hâlâ placeholder veya demo seviyesinde.

## Auth / Users / Roles / Register / Login Durumu

Auth tarafında yapılanlar gerçek ve katmanlı:

- `RegisterDto`, `LoginDto`, `RefreshDto` ile validation
- `AuthController` ile HTTP giriş noktaları
- `AuthService` ile auth orkestrasyonu
- `JwtStrategy` ile Bearer token doğrulama
- `JwtAuthGuard` ve `RolesGuard`
- `bcryptjs` ile şifre hash ve karşılaştırma
- access token + refresh token üretimi

Register akışı şu seviyede hazır:

- public register açık
- `MUSTERI` ve `NAKLIYECI` başlangıç rolü kabul ediliyor
- frontend tarafında eski isim uyumluluğu için `kullanici` değeri de gönderiliyor
- backend bunu `KULLANICI` üzerinden `MUSTERI` olarak normalize ediyor
- duplicate `mail` ve `kullaniciAdi` kontrolü var
- kullanıcı ve kullanıcı-rol bağı transaction ile yazılıyor
- başarılı register sonrası doğrudan token çifti dönüyor

Login akışı şu seviyede hazır:

- `mail` veya `kullaniciAdi` ile giriş yapılabiliyor
- şifre `bcryptjs.compare` ile doğrulanıyor
- başarılı girişte access + refresh dönüyor
- başarısız girişte `401 Invalid credentials.` dönüyor

`me` ve `refresh` akışı da hazır:

- `GET /auth/me` JWT ile korunuyor
- `POST /auth/refresh` refresh token ile yeni token çifti üretiyor

Ama auth sisteminin bugünkü sınırı net:

- refresh stateless
- revoke yok
- blacklist yok
- device/session yönetimi yok
- logout yok
- forgot/reset password yok
- email verification yok
- cookie tabanlı güvenlik modeli yok

`users` modülünün bugünkü rolü auth’ı desteklemek:

- aktif kullanıcıyı buluyor
- profil döndürüyor
- kullanıcı oluşturuyor
- auth-protected kullanıcı listesi döndürüyor

Ama henüz tam users modülü değil:

- update yok
- delete yok
- public CRUD yok
- admin yönetim akışı yok

`roles` modülünün bugünkü durumu:

- resmi roller sabitlenmiş: `MUSTERI`, `NAKLIYECI`, `ADMIN`
- `GET /roles/me` aktif
- `GET /roles/admin-probe` guard testi için var
- legacy veri uyumluluğu için `KULLANICI -> MUSTERI` dönüşümü var

Register/login hazırlık seviyesi için net hüküm:

- backend tarafında temel auth halkası hazır
- frontend tarafında bu halkayı kullanan minimum entegrasyon var
- ama bu hâl üretim seviyesinde bir auth sistemi değil, foundation seviyesinde çalışan bir auth sistemi

## Henüz İskelet Olan veya Başlanmayan Modüller

Backend tarafında şu modüller yalnızca kabuk halinde:

- `vehicles`
- `transport-requests`
- `offers`
- `jobs`
- `ratings`
- `notifications`

Bu modüllerin bugünkü ortak özelliği:

- yalnızca `module.ts` seviyesinde varlar
- controller yok
- service yok
- repository yok
- DTO’ları fiilen boş
- `AppModule` içine bağlı değiller

Yani klasör olarak mevcutlar, ama ürün davranışı olarak başlamamış sayılmaları gerekir.

Ek placeholder veya yarım alanlar:

- `apps/api/src/modules/users/dto/NakliyeciListItemResponseDto.ts` boş
- `apps/api/src/common/filters` boş
- `apps/web/src/proxy.ts` yalnızca gelecek auth yönlendirmeleri için hook
- dashboard sayfalarının tamamı placeholder

Bu nedenle “repo’da klasörü var” ile “çalışan modül var” aynı şey değil. Şu an domain modüllerinin çoğu yalnızca isimlendirilmiş durumda.

## Bilinçli Olarak Sonraya Bırakılanlar

Repo ve doküman akışına göre bilinçli olarak sonraya bırakılmış başlıklar şunlar:

- tam domain modülleri
- araç yönetimi
- taşıma isteği oluşturma ve listeleme
- teklif verme ve teklif yönetimi
- iş/nakliye akışı
- puanlama ve yorum akışı
- notification kanalları

Auth tarafında özellikle sonraya bırakılanlar:

- logout
- revoke
- refresh rotation
- blacklist
- device/session yönetimi
- email verification
- forgot password
- reset password

Users/roles tarafında sonraya bırakılanlar:

- admin user management
- public users CRUD
- role assignment CRUD
- soft delete akışının ürün seviyesinde açılması

Frontend tarafında sonraya bırakılanlar:

- auth context
- logout butonu
- navbar auth durumu
- route protection
- redirect akışları
- refresh token kullanımı
- dashboard ekranlarının işlevsel hale getirilmesi

Operasyon tarafında sonraya bırakılan önemli karar:

- rol seed süreci otomatik yapılmıyor
- sistem başlangıcında gizli veri üretimi yapılmıyor
- gerekli rol kayıtlarının veritabanında hazır bulunması bekleniyor

Bu gecikmeler dağınıklıktan değil, kapsam kontrolünden kaynaklanıyor.

## Mevcut Mimari Güçlü Yanları

- `apps/web` ve `apps/api` ayrımı sorumlulukları temiz ayırıyor.
- Monorepo yapısı iki uygulamayı aynı ürün bağlamında birlikte yönetmeyi kolaylaştırıyor.
- Nest tarafında controller, service, repository, DTO, guard ayrımı oturmuş.
- Prisma şeması domain’i önden düşünmüş durumda.
- Auth çekirdeği sahte değil; gerçek veritabanı ve gerçek token akışıyla çalışıyor.
- Backend build ve lint doğrulaması temiz.
- Web build doğrulaması geçiyor.
- Dokümantasyon yoğun; öğrenen geliştirici için karar zinciri izlenebilir durumda.
- Modüler monolith seçimi bugünkü ölçek için operasyonel olarak makul.
- REST sözleşmesi web ile backend arasında basit ve anlaşılır kalmış.

## Mevcut Mimari Riskli veya Eksik Yanları

- Prisma şeması geniş, ama çalışan domain kodu dar. Bu durum “tamamlanmış hissi” üretip yanlış beklenti yaratabilir.
- Domain modüllerinin klasör olarak var olması, fiilen başlamış oldukları anlamına gelmiyor.
- Web tarafında auth hâlâ `localStorage + alert` seviyesinde.
- Route protection ve session yönetimi henüz yok.
- Dashboard tamamen placeholder durumda.
- `iletisim/page.tsx` ürün sayfası değil, demo niteliğinde; ayrıca lint’i kırıyor.
- Bazı kaynak dosyalarda çok yoğun açıklama/comment ve yorum satırına alınmış alternatif kod var. Öğrenme açısından faydalı, ama üretim okunabilirliğini düşürüyor.
- Dokümanların bir kısmı teorik, bir kısmı güncel kodu birebir yansıtıyor. Bu yüzden repo içinde doküman-kod senkronunu zamanla korumak zorlaşabilir.
- `health` endpoint’inin `mode: "bootstrap"` demesi mevcut olgunluk seviyesini tam yansıtmıyor; bu küçük ama anlamlı bir sinyal.
- Role seed sürecinin manuel olması, yeni ortam kurulumunda register akışını kolayca bozabilir.

## Sonraki En Mantıklı Faz

Şu andan sonra en mantıklı faz `transport-requests` modülünün ilk gerçek domain halkası olarak açılmasıdır.

Neden bu faz?

- auth/users/roles zemini artık yeterince oturmuş durumda
- web tarafında en azından login/register yapılıp token alınabiliyor
- sistemde ilk gerçek ticari hareket müşterinin taşıma isteği oluşturmasıdır
- `offers`, `jobs`, `ratings` ve hatta birçok dashboard ekranı bu veri olmadan anlamlı şekilde başlayamaz

Bu fazın en doğru ilk dilimi şu olur:

- müşteri için taşıma isteği oluşturma
- müşterinin kendi isteklerini listeleme
- istek detayını görme

Bu seçim savunulabilir çünkü:

- auth altyapısını ilk kez gerçek domain yetkilendirmesinde kullanır
- veritabanındaki `Istek` ve `Durum` modellerini gerçek koda taşır
- sonraki modüllere veri zemini hazırlar

Kısacası sonraki fazın hedefi “yeni ekran eklemek” değil, sistemde ilk gerçek iş nesnesini ayağa kaldırmak olmalıdır.

## Alternatif Sonraki Fazlar ve Neden Şimdilik Seçilmedi

- `vehicles` modülü
Nakliyeci onboarding açısından mantıklı bir adaydır. Ama sistemde önce müşteri talebi oluşmadan araç yönetimi tek başına ürün değer zincirini açmaz.

- frontend auth hardening
Logout, redirect, navbar auth state ve route protection faydalıdır. Ama bunlar mevcut foundation’ı parlatır; ilk gerçek domain akışını açmaz.

- `offers` modülü
Doğrudan teklif akışına geçmek erken olur. Çünkü önce teklif verilecek bir `transport-request` nesnesi gerekir.

- admin/users management
Teknik olarak yapılabilir, ama şu an ana ürün akışını açan parça değildir. Temel ticari döngüye katkısı daha düşüktür.

- `notifications`, `ratings`, `jobs`
Bunlar ürün zincirinin daha geç halkalarıdır. İstek ve teklif akışı olmadan öncelik verilmesi doğru olmaz.

Bu yüzden bugünkü öncelik sırası şu şekilde okunmalıdır:

- önce `transport-requests`
- sonra `vehicles` ve/veya `offers`
- ardından `jobs`
- en sonra `ratings` ve `notifications`

## Toplantıda Kullanılacak Kısa Teknik Özet

Bu repo bugün iki uygulamalı bir monorepo olarak net durumda: `apps/web` Next.js frontend, `apps/api` NestJS backend. Backend tarafında modüler monolith ve REST yaklaşımı seçilmiş; auth, users ve roles çekirdeği gerçek kodla çalışıyor, Prisma şeması da ana domain tablolarını içeriyor. Register/login/me/refresh halkası backend’de hazır, web tarafında ise login ve register ekranları bu backend’e bağlanmış durumda.

Ama ürünün asıl domain modülleri henüz başlamış değil. `vehicles`, `transport-requests`, `offers`, `jobs`, `ratings` ve `notifications` şu an büyük ölçüde kabuk halinde. Dashboard ekranları da placeholder. Bu yüzden proje “temel auth altyapısı kurulmuş, ilk gerçek domain modülüne geçmeye hazır” aşamasında.

Bugün için en savunulabilir teknik durum cümlesi şudur:

Auth foundation tamamlanmış, minimal web entegrasyonu başlamış, ama ürünün esas iş akışı henüz açılmamış durumda. Sonraki doğru faz, `transport-requests` ile ilk gerçek domain akışını başlatmaktır.
