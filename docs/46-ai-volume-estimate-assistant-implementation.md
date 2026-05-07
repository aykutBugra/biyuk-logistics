# AI Volume Estimate Assistant - Implementation Report

## Scope

Bu fazda musteri `istek ekle` ekranina AI destekli tahmini hacim onerisi yardimcisi eklendi.

Uygulanan kapsam:

- backend tabanli `POST /volume-estimates` endpoint'i
- auth'lu musteri erisimi
- 1-3 gorsel upload akisi
- image validation ve normalization
- OpenAI vision + structured JSON output entegrasyonu
- kullanici bazli in-memory rate limit
- `istek ekle` ekraninda inline assistant paneli
- `Hacim alanina uygula` akisi

Bu fazda bilincli olarak yapilmayanlar:

- kesin fiziksel olcum iddiasi
- gorsellerin kalici saklanmasi
- AI analiz sonucunun DB'ye yazilmasi
- `istek duzenle` ekranina ayni yardimcinin tasinmasi
- request create akisini AI sonucuna baglama

## Backend

Yeni moduller ve dosyalar:

- `apps/api/src/config/ai.config.ts`
- `apps/api/src/modules/volume-estimation`

Yeni endpoint:

- `POST /api/v1/volume-estimates`

Endpoint davranisi:

- `multipart/form-data` kabul eder
- `images[]`, `description?`, `yukTipi?` alanlarini alir
- yalnizca `MUSTERI` rolune aciktir
- gorselleri normalize edip OpenAI'a backend uzerinden yollar
- onerilen hacim, aralik, guven seviyesi ve dikkat notlari dondurur

Image normalization:

- JPEG / PNG / WEBP kabul edilir
- orientation normalize edilir
- metadata / EXIF korunmaz
- uzun kenar `1600px` ustundeyse kucultulur
- OpenAI'a tek format olarak JPEG data URL gonderilir

Rate limit:

- kisa pencere: `3 analiz / 10 dakika`
- gunluk pencere: `20 analiz / 24 saat`
- tracker kullanici `id` bazlidir

## Frontend

Degisen yuzeyler:

- `apps/web/src/app/dashboard/istek_ekle/page.tsx`
- `apps/web/src/components/VolumeEstimateAssistant.tsx`
- `apps/web/src/lib/api/volume-estimates.ts`
- `apps/web/src/lib/api/api-client.ts`

Kullanici akisi:

- `Hacim (m3)` alaninin altinda `Goruntuyle tahmin et` paneli acilir
- kullanici 1-3 gorsel secer
- isterse kisa aciklama girer
- analiz sonucu karti gorur
- `Hacim alanina uygula` ile onerilen deger forma yazilir
- kullanici sonrasinda bu degeri manuel olarak degistirmeye devam eder

## Privacy ve Guardrails

- OpenAI API key yalnizca API tarafinda kullanilir
- browser OpenAI'a direkt baglanmaz
- gorseller DB'ye yazilmaz
- ham model cevabi UI'a tasinmaz
- request create akisi AI hatasindan etkilenmez

## Verification

Calistirilan komutlar:

- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Tum komutlar basariyla gecti.
