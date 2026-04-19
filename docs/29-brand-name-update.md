# Amaç

Bu adimin amaci, projede hala kalan gecici ve jenerik urun adi kullanimlarini kullaniciya gorunen yuzeylerde temizleyip resmi marka adini `Bi’yük` olarak yerlestirmekti.

Bu fazda:

- yalnizca branding metinleri guncellendi
- teknik omurga korunarak ilerlenildi
- route, package, import path, API path veya veritabani tarafina dokunulmadi

# Hangi Branding Metinleri Güncellendi

Guncellenen gorunen alanlar:

- root metadata title ve description
- navbar logo / marka metni
- ana sayfa hero ve aciklama metni
- login sayfasi basligi
- register sayfasi basligi
- hakkimizda sayfasindaki urun adi gecisi
- iletisim sayfasindaki destek e-postasi placeholder'i

Temizlenen eski branding cizgisi:

- `NakliyeSitesi`
- `Nakliye Sitesi`
- benzeri gecici marka kullanimlari

Yeni resmi gorunen marka:

- `Bi’yük`

# Hangi Dosyalar Değişti

Bu adimda degisen ana dosyalar:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/Navbar.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/register/page.tsx`
- `apps/web/src/app/hakkimizda/page.tsx`
- `apps/web/src/app/iletisim/page.tsx`
- `docs/29-brand-name-update.md`

# Neden Teknik Identifier’lara Dokunulmadı

Bu adim branding temizligi olarak tutuldu. Bu nedenle su alanlara bilinclı olarak dokunulmadi:

- repo klasor adi
- package isimleri
- import path'ler
- component ve file adlari
- route segmentleri
- env isimleri
- API endpoint path'leri
- Prisma model ve tablo adlari
- migration adlari
- state ve degisken isimleri

Sebep:

- marka metnini temizlemek icin teknik omurgayi yeniden adlandirmak gerekmiyordu
- genis rename operasyonu mevcut calisan sistemi gereksiz risk altina sokardi
- bu fazin kapsamı yalnizca kullaniciya gorunen ürün adi alanlariydi

# Bi’yük Yazım Kararı

Gorunen marka adi her yerde su yazimla kullanildi:

- `Bi’yük`

ASCII fallback yalnizca zorunlu oldugu bir alanda kullanildi:

- `destek@biyuk.local`

Bu kararın nedeni:

- e-posta adresinde marka yazimini teknik olarak daha uygun hale getirmek
- buna karsin kullaniciya gorunen marka alanlarinda resmi yazimi korumak

# Test / Kontrol Sonuçları

Calistirilan kontroller:

- `rg -n "NakliyeSitesi|Nakliye Sitesi|Nakliye Sitesine|Nakliye Sitesi'ne|nakliye sitesi|nakliye platformu|nakliyesitesi.local" apps/web docs`
- `npm run build:web`
- `npm run lint:web`

Sonuc:

- eski belirgin branding artigi kalmadi
- web build gecti
- web lint gecti

Not:

- bu adim API veya veritabani tarafinda degisiklik yapmadigi icin `build:api` ve `lint:api` kapsam disi tutuldu

# Bilinçli Olarak Yapılmayanlar

- yeni feature ekleme
- UI redesign
- component refactor
- route rename
- package rename
- veritabani degisikligi
- backend endpoint degisikligi
- PrimeReact entegrasyonu
- buyuk icerik yeniden yazimi
- tum docs klasorunu bastan elden gecirme

# Sonraki Küçük İyileştirme Alanları

Bu branding temizliginden sonra kucuk ve mantikli devam adimlari:

- sayfa bazli metadata eklenirse marka adini ayni cizgide korumak
- ileride footer eklenirse ayni branding yazimini kullanmak
- varsa ekran goruntusu, tasarim dokumani veya dis entegrasyon metinlerinde ayni marka dilini sabitlemek
