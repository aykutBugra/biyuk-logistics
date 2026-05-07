# Vehicle Capacity Reservation Foundation - Implementation Report

## Scope

Bu fazda arac bazli kapasite rezervasyonu foundation'i eklendi.

Uygulanan kapsam:

- `VehicleCapacityReservation` veri modeli
- offer accept sonrasi shipment olusurken reservation create
- shipment complete sonrasi reservation release
- vehicle list/detail response'larina `capacitySummary` eklenmesi
- `Araclarim` ve arac detay ekranlarinda kalan kapasite gorunurlugu
- `Acik Istek > detay > teklif ver` ekraninda secili arac sonrasi kapasite uyari karti

Bu fazda bilincli olarak yapilmayanlar:

- discovery listesinde kapasiteye gore hard filter
- teklif verme akisini kapasite nedeniyle bloklama
- `tekTasimaIstiyor` icin sert kural
- fiziksel sigma / istif motoru

## Backend

Yeni internal modul:

- `apps/api/src/modules/vehicle-capacity`

Yeni model:

- `VehicleCapacityReservation`

Aktif reservation kurali:

- `releasedAt IS NULL`

Lifecycle:

- `OffersService.acceptById(...)` icindeki shipment create transaction'ina reservation create baglandi
- `JobsService.completeById(...)` icindeki completion transaction'ina reservation release baglandi
- future-safe olarak `reassignReservationToVehicle(...)` helper'i eklendi

Vehicle response zenginlestirmesi:

- `/vehicles/my`
- `/vehicles/:id`

bu endpoint'ler artik `capacitySummary` donduruyor.

## Frontend

Degisen yuzeyler:

- `apps/web/src/app/dashboard/araclarim/page.tsx`
- `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`
- `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`
- `apps/web/src/lib/api/vehicles.ts`

Yeni gorunen bilgiler:

- toplam / rezerve / kalan agirlik
- toplam / rezerve / kalan hacim
- aktif rezervasyon sayisi
- aktif tek tasima rezervasyonu var mi bilgisi
- secili arac icin bu yuk eklendigindeki teorik sonrasi kapasite

Uyari dili:

- agirlik ve hacim asimi yalnizca uyari olarak gosterilir
- teklif butonu kapanmaz
- `tekTasimaIstiyor` ayri operasyonel uyari olarak kalir
- kapasite ozeti fiziksel sigma garantisi vermez

## Migration

Yeni migration:

- `apps/api/prisma/migrations/20260430150000_add_vehicle_capacity_reservation_foundation/migration.sql`

Not:

- repo'daki daha eski bir migration shadow database'de temiz apply olmadigi icin `prisma migrate dev --create-only` akisi bu turda kullanilamadi
- bu nedenle migration SQL'i manuel yazildi
- local veritabani icin `prisma db execute` ile uygulandi
- ardindan `prisma migrate resolve --applied 20260430150000_add_vehicle_capacity_reservation_foundation` ile apply kaydi isaretlendi

Ayrica migration icinde mevcut aktif shipment'ler icin reservation backfill eklendi.

## Verification

Calistirilan komutlar:

- `npm run prisma:generate`
- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Tum komutlar basariyla gecti.
