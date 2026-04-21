# Amaç

Bu adımın amacı, nakliyeci discovery ekranındaki şehir bazlı filtreleri serbest metin girişinden çıkarıp daha güvenilir ve normalize çalışan bir yapıya taşımaktı. Hedef, typo ve yazım standardı kaynaklı kaçan eşleşmeleri azaltırken mevcut discovery ekranını ve müşteri tarafındaki harita/place akışını bozmamaktı.

# Bu Adımda Ne Değişti

- `Acik istekler` filtre panelindeki `baslangicSehir` ve `varisSehir` alanları serbest text input olmaktan çıkarıldı.
- Web tarafına Türkiye'nin 81 ilini içeren kontrollü bir sabit veri kaynağı eklendi.
- Şehir filtreleri artık seçilen ili canonical normalize değerle API'ye gönderiyor.
- Backend tarafında şehir filtre eşleşmesi `contains` yerine normalized `equals` mantığına çekildi.
- Eski query param isimleri korunmaya devam etti: `baslangicSehir`, `varisSehir`.

# Neden Nakliyeci Şehir Filtresi İçin 81 İl Seçimi Tercih Edildi

Nakliyeci discovery filtresi şehir seviyesinde çalışıyor; burada place selection veya daha detaylı konum çözümü gerekmiyordu. Sorun, kullanıcıdan serbest metin alınması yüzünden oluşan yazım farklarıydı. Bu nedenle 81 il içinden kontrollü seçim, bu yüzey için en sade ve en güvenilir çözüm oldu.

# Neden Bu Alanda Harita Provider Kullanılmadı

Bu alan şehir filtresi; pickup/dropoff konum üretimi değil. Müşteri tarafındaki doğrulanmış konum ve place akışı zaten ayrı bir problem çözüyor. Nakliyeci discovery filtresinde harita provider kullanmak bu küçük düzeltme için gereksiz karmaşıklık ve gereksiz bağımlılık eklerdi.

# Frontend Tarafında Yapılanlar

- `apps/web/src/app/dashboard/acik_istekler/page.tsx` içinde iki şehir filtresi `CitySelectField` ile değiştirildi.
- `apps/web/src/components/CitySelectField.tsx` eklendi.
  - 81 il içinde arama yapıyor
  - kullanıcıyı yalnızca listeden seçim yapmaya yönlendiriyor
  - seçili değeri görünür tutuyor
  - seçim temizleme desteği veriyor
- `apps/web/src/lib/turkey-cities.ts` eklendi.
  - display label ve canonical value birlikte tutuluyor
  - Türkçe karakterli şehir adları doğru biçimde taşınıyor

# Backend Tarafında Yapılanlar

- `apps/api/src/common/utils/normalize-city-filter.ts` eklendi.
  - trim
  - ardışık boşlukları sadeleştirme
  - `toLocaleUpperCase("tr-TR")`
- `apps/api/src/modules/offers/offers.service.ts`
  - query'den gelen şehir değerleri repository'ye gitmeden önce canonical normalize ediliyor
- `apps/api/src/modules/offers/repositories/offers.repository.ts`
  - şehir filtreleri için `contains` kaldırıldı
  - önce `normalizeBaslangicSehir` / `normalizeVarisSehir` üzerinde `equals`
  - fallback olarak eski `baslangicSehri` / `varisSehri` alanlarında kontrollü `equals + insensitive`

# Normalize Şehir Eşleşmesi Yaklaşımı

Yeni yaklaşım gevşek veya fuzzy match kurmuyor. Amaç yanlış ili eşleştirmek değil, aynı ili tutarlı biçimde eşleştirmek.

Uygulanan mantık:
- giriş değeri trim edilir
- fazla boşluklar sadeleştirilir
- değer `tr-TR` locale ile upper-case canonical forma çevrilir

Böylece:
- `istanbul`
- ` İstanbul `
- `İSTANBUL`

aynı canonical değere yakınsar ve normalized şehir alanlarıyla güvenilir eşleşir.

# API ve Query Param Uyumluluğu

Bu adımda query param sözleşmesi değiştirilmedi.

Korunan alanlar:
- `baslangicSehir`
- `varisSehir`

Fark şu oldu:
- frontend artık bu alanlara serbest yazılmış text değil, canonical şehir değeri gönderiyor
- backend de gelen değeri normalize ederek işliyor

Bu sayede mevcut discovery API yüzeyi bozulmadan davranış güvenilir hale geldi.

# Test / Kontrol Sonuçları

Çalıştırılan kontroller:

- `npm run build:web`
- `npm run lint:web`
- `npm run build:api`
- `npm run lint:api`

Bu kontrollerin hedefi:
- yeni şehir seçim bileşeninin web build'ini bozmaması
- discovery filtresinin tip ve lint seviyesinde temiz kalması
- backend normalize helper ve repository değişikliğinin API build/lint akışını bozmaması

# Bilinçli Olarak Yapılmayanlar

- rota sapması / ekstra km / ekstra süre hesabı
- taşıyıcı rota tanımı
- harita provider veya place autocomplete'ı discovery şehir filtresine taşımak
- discovery ekranının büyük redesign'ı
- yeni modül açmak
- yeni tablo eklemek
- ranking / otomatik matching
- mesajlaşma / pazarlık
- fuzzy city matching

# Sonraki Mantıklı Adım

Bu düzeltmeden sonraki mantıklı adım, discovery filtrelerinde şehir dışındaki taşıyıcı uygunluk sinyallerini güçlendirmektir. Özellikle kapasite, yük tipi ve `tekTasimaIstiyor` filtrelerinin kullanıcı tarafında daha iyi okunması ve gerekirse sonraki aşamada ilçe/bölge seviyesine kontrollü genişleme değerlendirilebilir.
