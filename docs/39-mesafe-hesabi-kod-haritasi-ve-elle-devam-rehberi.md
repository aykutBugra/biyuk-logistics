# Mesafe Hesabi Kod Haritasi ve Elle Devam Rehberi

Bu dokumanin amaci iki seyi netlestirmektir:

1. Su anda request icin gercek yol mesafesi ve sure bilgisi hangi dosyalarda, hangi kod parcalariyla hesaplaniyor ve tasiniyor?
2. Sen bundan sonra mesafe verisini kullanarak kendi hesap mantigini elle yazmak istersen hangi dosyaya ne koymalisin?

Bu dokumanda tam feature kodu yazilmiyor. Kod iskeleti, yerlesim ve sorumluluk haritasi veriliyor.

---

# 1. Su An Mesafe Bilgisi Nasil Hesaplaniyor?

## 1.1 Veritabani alani

**Dosya**

`apps/api/prisma/schema.prisma`

**Eklenen alanlar**

```prisma
rotaMesafeMetre Int?
rotaSureSaniye  Int?
```

**Bu iki satirin gorevi**

- `rotaMesafeMetre`
  request icin gercek yol mesafesini metre cinsinden saklar.
- `rotaSureSaniye`
  ayni rota icin gercek yol suresini saniye cinsinden saklar.
- `Int?`
  alanin nullable oldugunu soyler.
  Bu sayede eski kayitlar migrate olduktan sonra bile zorunlu backfill gerektirmez.

**Neden burada tutuluyor?**

- Mesafe ve sure request kaydinin bir parcasi oldugu icin en dogru kaynak `Istek` tablosudur.
- Ayni veri her response'ta tekrar hesaplanmaz.
- Daha sonra fiyat onerisi gibi akislarda bu veri ayni kayittan okunur.

---

## 1.2 Route engine kontrati

**Dosya**

`apps/api/src/modules/locations/route-engine.contract.ts`

**Kritik kod parcasi**

```ts
export interface RouteEngine {
  readonly providerName: string;
  getRouteMetrics(
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints?: RoutePoint[]
  ): Promise<RouteMetrics>;
}
```

**Satir satir gorevi**

- `providerName`
  aktif route engine'in adini soyler. Ornegin `google`.
- `getRouteMetrics(...)`
  iki nokta arasinda rota metrikleri almak icin standart kapidir.
- `origin`
  baslangic noktasi.
- `destination`
  varis noktasi.
- `waypoints`
  ara duraklar icin rezervli alan. Bu adimda kullanilmiyor.
- `Promise<RouteMetrics>`
  sonuc olarak `distanceMeters` ve `durationSeconds` dondurur.

**Neden onemli?**

- Mesafe hesabini dogrudan feature servislerine gommek yerine soyutlar.
- Google disinda baska bir route engine eklemek isterse ayni imza korunur.

---

## 1.3 LocationsService uzerinden route engine cagirma

**Dosya**

`apps/api/src/modules/locations/locations.service.ts`

**Kritik kod parcasi**

```ts
async getRouteMetrics(
  provider: string,
  origin: RoutePoint,
  destination: RoutePoint,
  waypoints?: RoutePoint[]
): Promise<RouteMetrics> {
  this.assertProvider(provider, this.routeEngine.providerName);
  return this.routeEngine.getRouteMetrics(origin, destination, waypoints);
}
```

**Satir satir gorevi**

- `provider`
  gelen konumun hangi provider ile cozuldigini alir.
- `assertProvider(...)`
  secilen provider ile aktif route engine'in ayni oldugunu kontrol eder.
- `return this.routeEngine.getRouteMetrics(...)`
  asagidaki gerçek provider implementasyonuna delegasyon yapar.

**Neden onemli?**

- Feature servisleri `GoogleRouteEngine` sinifini dogrudan bilmez.
- Tek giris noktasi `LocationsService` olur.

---

## 1.4 Gercek Google Routes cagrisi

**Dosya**

`apps/api/src/modules/locations/google/google-route.engine.ts`

**Kritik kod parcasi**

```ts
const response = await fetch(
  "https://routes.googleapis.com/directions/v2:computeRoutes",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { ... },
      destination: { ... },
      intermediates: waypoints.map(...),
      travelMode: "DRIVE",
      languageCode: defaultLanguageCode,
    }),
  }
);
```

**Satir satir gorevi**

- `fetch(...)`
  Google Routes API'ye HTTP istegi atar.
- `"computeRoutes"`
  kusbakisi degil, gercek yol rotasi ureten endpoint'tir.
- `"X-Goog-Api-Key"`
  backend `.env` icindeki Google key'i kullanir.
- `"X-Goog-FieldMask"`
  sadece gerekli alanlari ister:
  `distanceMeters` ve `duration`
- `origin`
  baslangic canonical lat/lng verisi.
- `destination`
  varis canonical lat/lng verisi.
- `intermediates`
  gelecekte ara durak acilmasi icin uygun alan.
- `travelMode: "DRIVE"`
  arac rotasi ister.

**Validation parcasi**

```ts
const route = payload.routes?.[0];
const durationSeconds = route?.duration
  ? this.parseDurationSeconds(route.duration)
  : null;

if (
  typeof route?.distanceMeters !== "number" ||
  !Number.isFinite(route.distanceMeters) ||
  route.distanceMeters < 0 ||
  durationSeconds === null
) {
  throw new BadGatewayException("Rota metrikleri dogrulanamadi.");
}
```

**Satir satir gorevi**

- `payload.routes?.[0]`
  ilk rota sonucunu alir.
- `parseDurationSeconds(...)`
  Google'in duration string'ini saniyeye cevirir.
- `typeof route?.distanceMeters !== "number"`
  mesafe sayisal degilse kabul etme.
- `!Number.isFinite(...)`
  `NaN` veya `Infinity` ise kabul etme.
- `route.distanceMeters < 0`
  negatif veri varsa reddet.
- `durationSeconds === null`
  sure parse edilemediyse reddet.
- `throw new BadGatewayException(...)`
  sessiz fallback yazmak yerine create/update akisini durdur.

**Neden onemli?**

- Yanlis rota verisi DB'ye yazilmaz.
- Mesafe hesabi basarisizsa sorun hemen gorunur.

---

## 1.5 Request create sirasinda mesafe hesabi

**Dosya**

`apps/api/src/modules/transport-requests/transport-requests.service.ts`

**Kritik kod parcasi**

```ts
const routeFields = await this.resolveRouteFields(
  createTransportRequestDto.baslangicKonum,
  createTransportRequestDto.varisKonum
);

const transportRequest = await this.transportRequestsRepository.create({
  musteriId: currentUser.id,
  ...routeFields,
  ...
});
```

**Satir satir gorevi**

- `resolveRouteFields(...)`
  hem canonical konumlari cozer hem route metriklerini hesaplar.
- `routeFields`
  request'e yazilacak tum route ile ilgili alanlari tek pakette toplar.
- `...routeFields`
  hesaplanan alanlari repository create input'una yayar.

**Burada ne hesaplanir?**

- `baslangicSehri`
- `varisSehri`
- `baslangicKonumMetni`
- `varisKonumMetni`
- `baslangicProvider`
- `varisProvider`
- `baslangicPlaceId`
- `varisPlaceId`
- `normalizeBaslangicSehir`
- `normalizeVarisSehir`
- `normalizeBaslangicIlce`
- `normalizeVarisIlce`
- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`
- `rotaMesafeMetre`
- `rotaSureSaniye`

---

## 1.6 `resolveRouteFields` metodu ne yapiyor?

**Dosya**

`apps/api/src/modules/transport-requests/transport-requests.service.ts`

**Kritik kod parcasi**

```ts
const [resolvedBaslangicKonum, resolvedVarisKonum] = await Promise.all([
  this.locationsService.resolveCanonicalLocation(...),
  this.locationsService.resolveCanonicalLocation(...),
]);

const routeMetrics = await this.locationsService.getRouteMetrics(
  resolvedBaslangicKonum.provider,
  { lat: resolvedBaslangicKonum.lat, lng: resolvedBaslangicKonum.lng },
  { lat: resolvedVarisKonum.lat, lng: resolvedVarisKonum.lng }
);

return {
  ...,
  rotaMesafeMetre: routeMetrics.distanceMeters,
  rotaSureSaniye: routeMetrics.durationSeconds,
};
```

**Satir satir gorevi**

- `Promise.all([...])`
  baslangic ve varis canonical konumlarini paralel cozer.
- `resolveCanonicalLocation(...)`
  place id'den canonical location uretir.
- `getRouteMetrics(...)`
  bu iki canonical nokta arasinda gercek yol mesafesini alir.
- `distanceMeters`
  metre cinsinden sonucu verir.
- `durationSeconds`
  saniye cinsinden sonucu verir.
- `return { ... }`
  hem konum alanlarini hem rota alanlarini birlikte dondurur.

**Neden onemli?**

- Route hesap mantigi create/update icinde tekrar edilmez.
- Tek bir yardimci metoda toplanmis olur.

---

## 1.7 Request update sirasinda ne zaman yeniden hesap var?

**Dosya**

`apps/api/src/modules/transport-requests/transport-requests.service.ts`

**Kritik kod parcasi**

```ts
const routeFields = this.shouldRecalculateRoute(
  existingTransportRequest,
  updateTransportRequestDto
)
  ? await this.resolveRouteFields(
      updateTransportRequestDto.baslangicKonum,
      updateTransportRequestDto.varisKonum
    )
  : this.getStoredRouteFields(existingTransportRequest);
```

**Satir satir gorevi**

- `shouldRecalculateRoute(...)`
  gelen update isteginde konum degisti mi diye bakar.
- `? await this.resolveRouteFields(...)`
  konum degistiyse route'u yeniden hesaplar.
- `: this.getStoredRouteFields(...)`
  konum degismediyse mevcut route verisini korur.

**`shouldRecalculateRoute` neye bakar?**

```ts
this.hasLocationSelectionChanged(
  transportRequest.baslangicProvider,
  transportRequest.baslangicPlaceId,
  updateTransportRequestDto.baslangicKonum.provider,
  updateTransportRequestDto.baslangicKonum.placeId
)
```

**Bu karsilastirmanin gorevi**

- `provider` degismis mi?
- `placeId` degismis mi?

Bu iki deger ayniysa route recalculation yapilmaz.

---

## 1.8 Repository tarafinda DB'ye yazma

**Dosya**

`apps/api/src/modules/transport-requests/repositories/transport-requests.repository.ts`

**Create icin kritik kod parcasi**

```ts
data: {
  ...,
  rotaMesafeMetre: input.rotaMesafeMetre,
  rotaSureSaniye: input.rotaSureSaniye,
  ...
}
```

**Update icin kritik kod parcasi**

```ts
data: {
  ...,
  rotaMesafeMetre: input.rotaMesafeMetre,
  rotaSureSaniye: input.rotaSureSaniye,
  ...
}
```

**Map icin kritik kod parcasi**

```ts
rotaMesafeMetre: transportRequest.rotaMesafeMetre,
rotaSureSaniye: transportRequest.rotaSureSaniye,
```

**Satir satir gorevi**

- `input.rotaMesafeMetre`
  service katmaninda hesaplanan metre bilgisini DB alanina yazar.
- `input.rotaSureSaniye`
  service katmaninda hesaplanan sure bilgisini DB alanina yazar.
- `mapStoredTransportRequest(...)`
  DB'den gelen raw kaydi domain record'a cevirirken bu alanlari da tasir.

**Neden onemli?**

- Service hesaplar, repository saklar.
- Katman sorumluluklari temiz kalir.

---

## 1.9 DTO ve response yuzeyine tasima

### Transport request response'u

**Dosya**

`apps/api/src/modules/transport-requests/dto/transport-request-list-item-response.dto.ts`

**Kod parcasi**

```ts
rotaMesafeMetre!: number | null;
rotaSureSaniye!: number | null;
```

**Gorevi**

- `GET /transport-requests/my`
- `GET /transport-requests/:id`
- `POST /transport-requests`
- `PUT /transport-requests/:id`

yanitlarina bu alanlari ekler.

### Open requests response'u

**Dosya**

`apps/api/src/modules/offers/dto/open-request-list-item-response.dto.ts`

**Kod parcasi**

```ts
rotaMesafeMetre!: number | null;
rotaSureSaniye!: number | null;
```

**Gorevi**

- `GET /offers/open-requests`
- `GET /offers/open-requests/:id`

yanitlarina bu alanlari ekler.

---

## 1.10 Open request akisina tasima

**Dosyalar**

- `apps/api/src/modules/offers/repositories/offers.repository.ts`
- `apps/api/src/modules/offers/offers.service.ts`

**Repository'de gerekli secim**

```ts
select: {
  ...,
  rotaMesafeMetre: true,
  rotaSureSaniye: true,
}
```

**Repository map kodu**

```ts
rotaMesafeMetre: request.rotaMesafeMetre,
rotaSureSaniye: request.rotaSureSaniye,
```

**Service response map kodu**

```ts
rotaMesafeMetre: request.rotaMesafeMetre,
rotaSureSaniye: request.rotaSureSaniye,
```

**Satir satir gorevi**

- `select`
  DB'den bu iki alani da ceker.
- `map`
  repository record'una koyar.
- `service response map`
  API response'una tasir.

**Neden onemli?**

- Teklif ekraninda request detail okunurken mesafe verisi hazir olur.

---

## 1.11 Web tiplerine tasima

**Dosyalar**

- `apps/web/src/lib/api/transport-requests.ts`
- `apps/web/src/lib/api/offers.ts`

**Kod parcasi**

```ts
rotaMesafeMetre: number | null;
rotaSureSaniye: number | null;
```

**Satir satir gorevi**

- frontend TypeScript'in bu alanlari tanimasini saglar
- `request.rotaMesafeMetre` ve `request.rotaSureSaniye` kullanilirken tip hatasi cikmasini engeller

---

# 2. Mesafe Verisini Kullanacak Kalan Kodu Sen Nereye Yazacaksin?

Bu bolum, senin elle eklemek istedigin "mesafe verisini kullanarak fiyat onerisi veya yardimci hesap yapma" adimi icindir.

Bu adimda backend'e dokunman gerekmez.
Eger hesap sadece UI yardimcisi olacaksa, dogru yer **web tarafi**dir.

---

## 2.1 Yeni hesap fonksiyonu icin acilacak dosya

**Olusturacagin dosya**

`apps/web/src/lib/pricing/offer-price-suggestion.ts`

**Buraya koyacagin kod iskeleti**

```ts
export type OfferPriceSuggestionInput = {
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tekTasimaIstiyor: boolean;
};

export type OfferPriceSuggestionResult = {
  onerilenFiyat: number;
  km: number;
  sureSaat: number;
};

export function calculateOfferPriceSuggestion(
  input: OfferPriceSuggestionInput
): OfferPriceSuggestionResult | null {
  if (input.rotaMesafeMetre == null || input.rotaSureSaniye == null) {
    return null;
  }

  const km = input.rotaMesafeMetre / 1000;
  const sureSaat = input.rotaSureSaniye / 3600;

  // Buraya kendi fiyat formulu mantigini yazacaksin

  return {
    onerilenFiyat: 0,
    km,
    sureSaat,
  };
}
```

**Satir satir gorevi**

- `OfferPriceSuggestionInput`
  hesap fonksiyonunun hangi verileri alacagini tanimlar.
- `rotaMesafeMetre`
  request'ten gelen ham mesafe.
- `rotaSureSaniye`
  request'ten gelen ham sure.
- `agirlikKg`, `hacimM3`, `yukTipi`, `tekTasimaIstiyor`
  fiyat formulunde kullanmak isteyebilecegin diger request alanlari.
- `OfferPriceSuggestionResult`
  fonksiyonun ne dondurecegini tanimlar.
- `onerilenFiyat`
  senin hesaplayacagin sonuc.
- `km`
  ekranda gostermek istersen diye turetilmis veri.
- `sureSaat`
  ekranda gostermek istersen diye turetilmis veri.
- `if (input.rotaMesafeMetre == null || input.rotaSureSaniye == null)`
  request'te rota verisi yoksa hesap yapma.
- `const km = ...`
  metreyi kilometreye cevirir.
- `const sureSaat = ...`
  saniyeyi saate cevirir.
- `// Buraya kendi fiyat formulu mantigini yazacaksin`
  tam olarak senin ekleyecegin kisim burasidir.

**Neden bu dosya?**

- Saf hesap fonksiyonu UI component'ine gomulmez.
- Tekrar kullanmak kolay olur.
- Test etmek kolay olur.

---

## 2.2 Bu hesap fonksiyonunu cagiracagin ekran

**Dosya**

`apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`

Bu ekran su anda open request detail ve teklif formunu birlikte tasiyor.
Fiyat onerisi burada hesaplanmali cunku:

- request detail burada yukleniyor
- `rotaMesafeMetre` ve `rotaSureSaniye` burada hazir
- teklif formundaki `fiyat` alani da burada

**Bu dosyaya ekleyecegin import iskeleti**

```ts
import { calculateOfferPriceSuggestion } from "@/lib/pricing/offer-price-suggestion";
```

**Bu dosya icinde request'ten hesap cikaracagin iskelet**

```ts
const priceSuggestion = request
  ? calculateOfferPriceSuggestion({
      rotaMesafeMetre: request.rotaMesafeMetre,
      rotaSureSaniye: request.rotaSureSaniye,
      agirlikKg: request.agirlikKg,
      hacimM3: request.hacimM3,
      yukTipi: request.yukTipi,
      tekTasimaIstiyor: request.tekTasimaIstiyor,
    })
  : null;
```

**Satir satir gorevi**

- `request ? ... : null`
  request yuklenmeden hesap yapma.
- `request.rotaMesafeMetre`
  backend'den gelen ham mesafeyi fonksiyona verir.
- `request.rotaSureSaniye`
  backend'den gelen ham sureyi fonksiyona verir.
- diger alanlar
  senin formulunde kullanmak istersen diye eklenir.

---

## 2.3 Hesap sonucunu nerede gostereceksin?

**Ayni dosya**

`apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`

Teklif formunun ustune veya hemen icine bir bilgi kutusu koymalisin.

**Yazacagin gorunum iskeleti**

```tsx
{priceSuggestion ? (
  <div>
    <p>Onerilen fiyat: ...</p>
    <p>Mesafe: ...</p>
    <p>Sure: ...</p>
  </div>
) : null}
```

**Satir satir gorevi**

- `{priceSuggestion ? (...) : null}`
  hesap sonucu varsa goster.
- `Onerilen fiyat`
  senin fonksiyonunun dondurdugu degeri gosterir.
- `Mesafe`
  ekranda kilometre bilgisi gostermek istersen kullanirsin.
- `Sure`
  ekranda saat veya dakika gostermek istersen kullanirsin.

**Istersen ayni yerde bir buton ekleyebilirsin**

```tsx
onClick={() =>
  setForm((currentForm) => ({
    ...currentForm,
    fiyat: String(priceSuggestion.onerilenFiyat),
  }))
}
```

**Bu satirlarin gorevi**

- `setForm(...)`
  mevcut teklif form state'ini gunceller.
- `fiyat: String(...)`
  onerilen fiyati input'a basar.

Bu adim opsiyoneldir.
Istersen sadece gosterir, input'a otomatik yazmazsin.

---

## 2.4 Hangi dosyaya yazma?

Eger amacin sadece kullaniciya yardimci olacak bir fiyat onerisi gostermekse, su dosyalara kod yazma:

- `apps/api/src/modules/offers/offers.service.ts`
- `apps/api/src/modules/offers/repositories/offers.repository.ts`
- `apps/api/src/modules/transport-requests/transport-requests.service.ts`
- `apps/api/src/modules/locations/google/google-route.engine.ts`

**Neden yazma?**

- Bunlar su anda rota verisini hesaplayan ve tasiyan backend katmanlari.
- Fiyat onerisi buralara yazilirsa business logic backend'e tasinmis olur.
- Senin istedigin elde yazilacak UI yardimcisi ise dogru yer frontend helper + teklif ekrani.

---

## 2.5 Eger liste ekraninda da gostermek istersen

Ek mesafe/sure gostermek istersen su dosyalarda sadece render yazarsin:

- `apps/web/src/app/dashboard/acik_istekler/page.tsx`
- `apps/web/src/app/dashboard/isteklerim/[id]/page.tsx`

**Burada yeni API yazmazsin**

Cunku veri zaten geliyor.
Sadece mevcut `request` nesnesinden:

- `request.rotaMesafeMetre`
- `request.rotaSureSaniye`

alanlarini okuyup ekranda gosterirsin.

---

# 3. Kisa Karar Ozeti

## Mevcut mesafe hesabi icin kritik dosyalar

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/locations/route-engine.contract.ts`
- `apps/api/src/modules/locations/locations.service.ts`
- `apps/api/src/modules/locations/google/google-route.engine.ts`
- `apps/api/src/modules/transport-requests/transport-requests.service.ts`
- `apps/api/src/modules/transport-requests/repositories/transport-requests.repository.ts`
- `apps/api/src/modules/transport-requests/dto/transport-request-list-item-response.dto.ts`
- `apps/api/src/modules/offers/repositories/offers.repository.ts`
- `apps/api/src/modules/offers/offers.service.ts`
- `apps/api/src/modules/offers/dto/open-request-list-item-response.dto.ts`
- `apps/web/src/lib/api/transport-requests.ts`
- `apps/web/src/lib/api/offers.ts`

## Senin elle yazacagin devam kodu icin kritik dosyalar

- yeni helper:
  `apps/web/src/lib/pricing/offer-price-suggestion.ts`
- teklif ekrani:
  `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`
- opsiyonel liste/detail render:
  `apps/web/src/app/dashboard/acik_istekler/page.tsx`
  `apps/web/src/app/dashboard/isteklerim/[id]/page.tsx`

## En kisa cevap

Mesafeyi hesaplayan mevcut kod backend'de zaten hazir.
Senin elle yazacagin kalan kisim buyuk ihtimalle sadece sunlar:

1. `apps/web/src/lib/pricing/offer-price-suggestion.ts`
   kendi formullu hesap fonksiyonu
2. `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`
   bu fonksiyonu cagirip ekranda gosterme veya input'a yazma

Bu iki dosya disinda yeni fiyat mantigi icin baska yere baslamana gerek yok.
