# Web Auth Navbar ve Redirect

## Amaç

Bu adımın amacı, `apps/web` tarafındaki auth görünürlüğünü sade ama belirgin hale getirmektir. Kapsam yalnızca frontend UX tarafındadır:

- login ve register sonrası kullanıcıyı ana sayfaya yönlendirmek
- navbar’ı auth durumuna göre güncellemek
- logout ile frontend oturumunu temizlemek
- mevcut `localStorage` tabanlı auth kaydını tek yerden okumak

Bu adımda backend sözleşmesi değiştirilmemiştir.

## Bu Adımda Ne Değişti

- `localStorage` içindeki auth verisini tek yerden yöneten yeni bir helper eklendi.
- Navbar client component haline getirildi ve auth değişikliklerini dinler hale geldi.
- Login ve register sayfaları başarılı işlemden sonra sessizce `/` sayfasına yönlendirilecek şekilde güncellendi.
- Auth olmuş kullanıcı `/login` veya `/register` sayfasına girerse ana sayfaya yönlendirilir hale geldi.
- Logout davranışı frontend tarafında storage temizliği + `router.replace("/")` ile çalışır hale getirildi.
- `/hakkimizda` sayfası token okumayı artık helper üzerinden yapıyor.

## Navbar Davranışı

- Kullanıcı auth değilse navbar sağ tarafta `Giriş Yap` ve `Kayıt Ol` gösterir.
- Kullanıcı auth ise bu iki link gizlenir.
- Auth olmuş kullanıcı için sade bir durum göstergesi gösterilir:
  - mümkünse `Merhaba, {kullaniciAdi}`
  - `user` bilgisi yoksa sade bir `Giriş yapıldı`
- Auth olmuş kullanıcı için ayrıca `Çıkış Yap` butonu görünür.
- Logout yapıldığında navbar aynı tab içinde anında eski unauth görünümüne döner.

## Login ve Register Sonrası Yönlendirme

- Başarılı login sonrası auth cevabı helper ile storage’a yazılır ve kullanıcı `router.replace("/")` ile ana sayfaya yönlendirilir.
- Başarılı register sonrası da aynı akış uygulanır.
- Başarı alert’i kaldırılmıştır; başarı sinyali redirect + navbar değişimi üzerinden görünür hale gelmiştir.
- Hata durumunda mevcut sade `alert` yaklaşımı korunmuştur.
- Kullanıcı zaten auth olmuşsa `/login` ve `/register` sayfaları form göstermeden ana sayfaya yönlendirir.

## Logout Davranışı

- Logout için backend endpoint kullanılmadı.
- `localStorage` içindeki auth kaydı helper ile temizlenir.
- Aynı anda custom auth-change event yayınlanır.
- Navbar bu değişikliği dinlediği için görünüm anında güncellenir.
- Ardından kullanıcı `router.replace("/")` ile ana sayfaya yönlendirilir.

## Frontend Auth Durumu Nasıl Okunuyor

Yeni auth helper dosyası:

- `apps/web/src/lib/auth/auth-storage.ts`

Bu helper şu işleri tek yerde toplar:

- auth kaydını parse etmek
- auth kaydını storage’a yazmak
- auth kaydını silmek
- access token’i çekmek
- auth var mı kontrol etmek
- auth değişimlerini dinlemek

Sağlanan yüzey:

- `getStoredAuth()`
- `setStoredAuth(auth)`
- `clearStoredAuth()`
- `getAccessToken()`
- `isAuthenticated()`
- `subscribeToAuthChanges(callback)`

Bu yapı özellikle büyük state management kurmadan, mevcut minimal auth yapısını temiz tutmak için seçildi.

## Oluşturulan / Düzenlenen Dosyalar

Oluşturulan dosyalar:

- `apps/web/src/lib/auth/auth-storage.ts`
- `docs/16-web-auth-navbar-and-redirect.md`

Düzenlenen dosyalar:

- `apps/web/src/components/Navbar.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/register/page.tsx`
- `apps/web/src/app/hakkimizda/page.tsx`

## Bilinçli Olarak Yapılmayanlar

- `apps/api` tarafında hiçbir değişiklik yapılmadı.
- Backend auth sözleşmesi değiştirilmedi.
- Logout için backend endpoint eklenmedi.
- Context, Zustand, Redux gibi büyük state yapıları kurulmadı.
- Refresh automation veya full session restore sistemi kurulmadı.
- Protected route sistemi kurulmadı.
- Proxy tabanlı auth redirect yapılmadı.
- Dashboard placeholder sayfaları doldurulmadı.
- Domain modüllerine geçilmedi.
- `transport-requests`, `vehicles`, `offers`, `jobs`, `ratings`, `notifications` tarafına dokunulmadı.

## Test / Kontrol Sonuçları

Çalıştırılan komutlar:

- `npm run build:web` -> geçti
- `npm run lint:web` -> geçmedi

`lint:web` hatası bu adımın yaptığı değişikliklerden gelmiyor. Mevcut hata:

- `apps/web/src/app/iletisim/page.tsx`
- React immutability ihlali
- `ortalama` değişkeninin render sonrası yeniden atanması

Bu dosya bu adımın kapsamına dahil edilmediği için hata yalnızca not olarak bırakıldı.

Fonksiyonel kabul durumu:

- login sonrası `/` yönlendirmesi eklendi
- register sonrası `/` yönlendirmesi eklendi
- auth olmuş kullanıcı navbar’da `Login / Register` görmez
- auth olmuş kullanıcı navbar’da kullanıcı adı veya giriş göstergesi görür
- logout sonrası navbar eski haline döner
- logout sonrası `router.replace("/")` çalışır
- `/hakkimizda` sayfası token okumaya devam eder

## Sonraki Mantıklı Adım

Bu adımdan sonra en mantıklı küçük frontend auth devamı:

- navbar veya ana sayfada daha belirgin auth durumu gösterimi
- gerekirse logout sonrası kısa kullanıcı geri bildirimi
- ardından domain tarafına geçilecekse `transport-requests` modülü ile ilk gerçek ürün akışını açmak

Bu adımın amacı auth görünürlüğünü toparlamaktı; domain iş akışı bu aşamada özellikle açılmadı.
