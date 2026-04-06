# JS to TS Migration

## Amaç

Bu çalışma, `src` altındaki yanlış kalmış JavaScript dosyalarını mevcut proje yapısını koruyarak TypeScript'e taşımak için yapıldı.

Kapsam:

- App Router altındaki JSX dönen `page.js` dosyalarını `page.tsx` yapmak
- JSX içermeyen repository dosyasını `.ts` uzantısına çevirmek
- Import çözünürlüğünü bozmamak
- Build davranışını korumak
- Büyük refactor yapmamak

## Dönüştürülen Dosyalar

### `.tsx` olanlar

- `src/app/hakkimizda/page.js` -> `src/app/hakkimizda/page.tsx`
- `src/app/iletisim/page.js` -> `src/app/iletisim/page.tsx`
- `src/app/login/page.js` -> `src/app/login/page.tsx`
- `src/app/dashboard/acik_istekler/page.js` -> `src/app/dashboard/acik_istekler/page.tsx`
- `src/app/dashboard/araclarim/page.js` -> `src/app/dashboard/araclarim/page.tsx`
- `src/app/dashboard/arac_ekle/page.js` -> `src/app/dashboard/arac_ekle/page.tsx`
- `src/app/dashboard/isteklerim/page.js` -> `src/app/dashboard/isteklerim/page.tsx`
- `src/app/dashboard/istek_ekle/page.js` -> `src/app/dashboard/istek_ekle/page.tsx`
- `src/app/dashboard/paun_ver/page.js` -> `src/app/dashboard/paun_ver/page.tsx`
- `src/app/dashboard/profil/page.js` -> `src/app/dashboard/profil/page.tsx`
- `src/app/dashboard/puanlarim/page.js` -> `src/app/dashboard/puanlarim/page.tsx`
- `src/app/dashboard/tekliflerim/page.js` -> `src/app/dashboard/tekliflerim/page.tsx`
- `src/app/dashboard/teklif_ver/page.js` -> `src/app/dashboard/teklif_ver/page.tsx`

### `.ts` olanlar

- `src/lib/server/db/repositories/users.js` -> `src/lib/server/db/repositories/users.ts`

## Eklenen Destekleyici Dosyalar

- `src/lib/server/db/client.ts`

Bu dosya, `users.ts` içindeki mevcut Prisma importunu TypeScript altında çözülebilir ve derlenebilir hale getirmek için eklendi.

## Neden Bu Ayrım Yapıldı

- `page` dosyaları JSX döndürdüğü için `tsx` uzantısına taşındı.
- `users` repository dosyası JSX içermediği için `ts` uzantısına taşındı.
- Next.js App Router dosya konvansiyonu korunarak route isimleri değiştirilmedi.

## Import Tarafında Yapılan Düzenlemeler

- `src` altındaki dönüştürülen dosyalarda uzantı bazlı import bulunmadığı için geniş çaplı import düzeltmesi gerekmedi.
- `src/lib/server/db/repositories/users.ts` dosyasındaki `@/lib/server/db/client` importu korunarak gerçek bir `client.ts` dosyası eklendi.
- TypeScript uyumu için `@prisma/client` bağımlılığı eklendi.
- Prisma client tiplerinin oluşması için `prisma generate` çalıştırıldı.

## Geçici Tip Kararları

`src/lib/server/db/repositories/users.ts` içinde minimal bir `ActiveUser` tipi tanımlandı:

- `userId` parametresi `number` olarak belirlendi
- dönüş tipi `Promise<ActiveUser | null>` olarak yazıldı
- Prisma sorgu sonucunun detaylı manuel modeli çıkarılmadı; mevcut davranışı bozmadan yalnızca dış arayüz tipi netleştirildi

Bu tercih, gereksiz tip karmaşıklığı eklemeden fonksiyonun dış kontratını belirginleştirmek için yapıldı.

## Özel Notlar

- `src/app/dashboard/isteklerim/page.js` dosyası boştu.
- TypeScript'e taşındıktan sonra Next.js build'inin kırılmaması için aynı placeholder davranışıyla minimal `page.tsx` içeriği eklendi.
- Bu, mimari değişiklik değil, mevcut route'un geçerli bir page export'una sahip olmasını sağlayan güvenli bir düzeltmedir.

## Riskli / Sonra İyileştirilecek Noktalar

- `npm run lint` halen `src/app/register/page.tsx` içinde `react/no-unescaped-entities` hatası veriyor.
- Bu hata migration kapsamındaki dosyalardan gelmiyor; ayrı bir lint temizliği olarak ele alınmalı.
- Projede Node `v22.12.0` ile `EBADENGINE` uyarısı görülüyor. Kurulum ve build çalıştı, ancak bağımlılık beklentisine daha yakın bir sürüm için `v22.13+` tercih edilmeli.
- Prisma tarafı şu an generate edilerek TypeScript ile uyumlu hale getirildi; şema değişirse yeniden `prisma generate` çalıştırılması gerekecek.

## Kontrol Sonucu

- `src` altında kalan `.js` dosyası yok
- `npx tsc --noEmit` başarılı
- `npm run build` başarılı
- `npm run lint` sadece mevcut `register` sayfasındaki ayrı bir apostrof hatası nedeniyle başarısız
