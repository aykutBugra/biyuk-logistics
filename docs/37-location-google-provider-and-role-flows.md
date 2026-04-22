# Amac

Bu dokuman, repo icindeki `location` altyapisini hem musteri hem nakliyeci akisina gore detayli anlatir.

Odak noktasi:

1. `Locations` modulu ne yapiyor
2. Google API'ler hangi endpoint'lerle nasil kullaniliyor
3. Musteri akisi: konum arama, secme, dogrulama, DB'ye yazma
4. Nakliyeci akisi: discovery ve detay ekranlarinda bu verinin nasil tuketildigi
5. DB tarafinda hangi alanlar var
6. Su an sistemin neyi yaptigi, neyi henuz yapmadigi

Not:

- Repo su an rol olarak pratikte `MUSTERI` ve `NAKLIYECI` ile calisiyor.
- Ileride rol bazli daha zengin location altyapisi kurulabilir, ama repoda su anda `musteri adres kitabi`, `nakliyeci rota plani`, `nakliyeci favori bolgeleri`, `canli arac konumu` gibi ayri tablolar yok.
- Mevcut tasarim request-merkezli: dogrulanmis pickup/dropoff bilgisi `Istek` ustunde tutuluyor, nakliyeci de bu veriyi okuyup filtreliyor.

---

# 1. Buyuk Resim

Bu projede `location` konusu iki farkli seviyede ele alinmis durumda:

## 1. Dogrulanmis pickup / dropoff secimi

Bu kisim agirlikli olarak musteri tarafinda calisiyor.

Kullanici:

- baslangic konumunu ariyor
- varis konumunu ariyor
- Google Places autocomplete'den bir secim yapiyor
- secilen `placeId` backend'e gidiyor
- backend tekrar Google Place Details cagirip canonical konum uretiyor
- sonra bu canonical veri `Istek` kaydina yaziliyor

## 2. Bu dogrulanmis verinin discovery ve okunmasi

Bu kisim agirlikli olarak nakliyeci tarafinda kullaniliyor.

Nakliyeci:

- acik istekleri listeliyor
- sehir bazli filtre uyguluyor
- request detail ekraninda canonical konumu goruyor
- ama su an kendi rotasini Google ile olusturup sistemin rota uyumu hesaplamasini kullanmiyor

Yani ozetle:

- musteri tarafi: location uretir
- nakliyeci tarafi: location verisini tuketir

---

# 2. Modul Mimarisi

## Config yuklemesi

### Dosya: `apps/api/src/app.module.ts`

```ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [appConfig, authConfig, mapsConfig],
  envFilePath: getEnvFilePaths(),
}),
```

Buradan anlasilan sey:

- harita / provider ayarlari `mapsConfig` ile global config'e yukleniyor
- `LocationsModule` de uygulamaya import ediliyor

### Dosya: `apps/api/src/config/maps.config.ts`

```ts
export default registerAs("maps", () => ({
  provider: (process.env.MAP_PROVIDER ?? "google").trim().toLowerCase(),
  routeEngine: (process.env.ROUTE_ENGINE ?? "google").trim().toLowerCase(),
  googleApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  defaultLanguageCode: (process.env.MAP_LANGUAGE_CODE ?? "tr").trim(),
  defaultRegionCode: (process.env.MAP_REGION_CODE ?? "TR").trim().toUpperCase(),
}));
```

Mevcut env seviyesindeki kararlar:

- `MAP_PROVIDER`: su an default `google`
- `ROUTE_ENGINE`: su an default `google`
- `GOOGLE_MAPS_API_KEY`: Places + Routes icin gerekli anahtar
- `MAP_LANGUAGE_CODE`: default `tr`
- `MAP_REGION_CODE`: default `TR`

## Provider-agnostic tasarim

Kod "Google ile basliyor" ama dogrudan tum uygulamayi Google class'ina kilitlemiyor.

### Dosya: `apps/api/src/modules/locations/location-provider.contract.ts`

```ts
export interface LocationProvider {
  readonly providerName: string;
  autocomplete(query: string, sessionToken?: string): Promise<LocationSuggestion[]>;
  getPlaceDetails(placeId: string, sessionToken?: string): Promise<CanonicalLocation>;
}
```

### Dosya: `apps/api/src/modules/locations/route-engine.contract.ts`

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

Bu kontratlar sayesinde sistem mantigi soyle kurulu:

- autocomplete / place details bir provider contract'i
- route hesaplama ayri bir engine contract'i
- yarin Google yerine baska bir servis konulmak istenirse teorik olarak yer acik

## Token bazli DI

### Dosya: `apps/api/src/modules/locations/location.tokens.ts`

```ts
export const LOCATION_PROVIDER = Symbol("LOCATION_PROVIDER");
export const ROUTE_ENGINE = Symbol("ROUTE_ENGINE");
```

### Dosya: `apps/api/src/modules/locations/locations.module.ts`

```ts
providers: [
  LocationsService,
  GoogleLocationProvider,
  GoogleRouteEngine,
  {
    provide: LOCATION_PROVIDER,
    inject: [ConfigService, GoogleLocationProvider],
    useFactory: (
      configService: ConfigService,
      googleProvider: GoogleLocationProvider
    ): LocationProvider => {
      const provider = configService.get<string>("maps.provider") ?? "google";

      if (provider === "google") {
        return googleProvider;
      }

      throw new Error(`Unsupported map provider: ${provider}`);
    },
  },
  {
    provide: ROUTE_ENGINE,
    inject: [ConfigService, GoogleRouteEngine],
    useFactory: (
      configService: ConfigService,
      googleRouteEngine: GoogleRouteEngine
    ): RouteEngine => {
      const provider = configService.get<string>("maps.routeEngine") ?? "google";

      if (provider === "google") {
        return googleRouteEngine;
      }

      throw new Error(`Unsupported route engine: ${provider}`);
    },
  },
],
```

Buradaki fikir:

- uygulama "Google kullan" diye hardcode edilmis degil
- ama su anki tek somut implementasyon Google
- provider secimi config uzerinden yapiliyor

## Service seviyesi

### Dosya: `apps/api/src/modules/locations/locations.service.ts`

```ts
export class LocationsService {
  constructor(
    @Inject(LOCATION_PROVIDER)
    private readonly locationProvider: LocationProvider,
    @Inject(ROUTE_ENGINE)
    private readonly routeEngine: RouteEngine
  ) {}

  autocomplete(query: string, sessionToken?: string): Promise<LocationSuggestion[]> {
    return this.locationProvider.autocomplete(query, sessionToken);
  }

  getPlaceDetails(placeId: string, sessionToken?: string): Promise<CanonicalLocation> {
    return this.locationProvider.getPlaceDetails(placeId, sessionToken);
  }
}
```

Burasi `facade` gibi calisiyor:

- controller dogrudan Google class'i gormuyor
- feature servisleri dogrudan Google class'i gormuyor
- hepsi `LocationsService` uzerinden ilerliyor

## Provider guvenlik kontrolu

### Dosya: `apps/api/src/modules/locations/locations.service.ts`

```ts
async resolveCanonicalLocation(
  provider: string,
  placeId: string,
  sessionToken?: string
): Promise<CanonicalLocation> {
  this.assertProvider(provider, this.locationProvider.providerName);
  return this.locationProvider.getPlaceDetails(placeId, sessionToken);
}
```

### Dosya: `apps/api/src/modules/locations/locations.service.ts`

```ts
private assertProvider(selectedProvider: string, configuredProvider: string) {
  if (selectedProvider.trim().toLowerCase() === configuredProvider.trim().toLowerCase()) {
    return;
  }

  throw new InternalServerErrorException("Requested location provider is not available.");
}
```

Bu kontrol ne ise yariyor:

- frontend "google" diye bir secim yollamissa
- ama backend artik baska provider'a gecmis durumdaysa
- eski provider bilgisiyle yanlis data resolve edilmesin diye request reddediliyor

Yani `provider` alani sadece dekoratif degil; config ile secilen provider'la uyum kontrolu de yapiyor.

---

# 3. Google API'ler Tam Olarak Nasil Kullaniliyor

Bu repoda Google tarafinda iki ana API kullaniliyor:

1. Google Places API
2. Google Routes API

## 3.1 Places Autocomplete

### Dosya: `apps/api/src/modules/locations/google/google-location.provider.ts`

```ts
const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
  },
  body: JSON.stringify({
    input: query,
    includedRegionCodes: [defaultRegionCode.toLowerCase()],
    languageCode: defaultLanguageCode,
    ...(sessionToken ? { sessionToken } : {}),
  }),
});
```

Bu request'in anlamlari:

- endpoint: Google Places Autocomplete
- method: `POST`
- API key header'da
- `input`: kullanicinin yazdigi metin
- `includedRegionCodes`: default `TR`, yani sonucu Turkiye ile sinirlamaya calisiyor
- `languageCode`: default `tr`
- `sessionToken`: autocomplete ile details secimini ayni arama oturumu icinde birlestirmek icin

### Ayni dosya

```ts
const payload = (await response.json()) as unknown;
return mapGoogleAutocompleteResponse(payload as never).slice(0, 5);
```

Burada da:

- Google'dan gelen response direkt frontend'e gitmiyor
- once internal shape'e map ediliyor
- sonra en fazla `5` oneride kirpiliyor

## 3.2 Place Details

### Dosya: `apps/api/src/modules/locations/google/google-location.provider.ts`

```ts
const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
url.searchParams.set("languageCode", defaultLanguageCode);
url.searchParams.set("regionCode", defaultRegionCode);
if (sessionToken) {
  url.searchParams.set("sessionToken", sessionToken);
}

const response = await fetch(url, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask":
      "id,displayName,formattedAddress,location,addressComponents",
  },
});
```

Buradaki onemli nokta `X-Goog-FieldMask`:

- tum Google response'u cekmiyor
- sadece ihtiyac olan alanlari istiyor

Istenen alanlar:

- `id`
- `displayName`
- `formattedAddress`
- `location`
- `addressComponents`

Bu iyi bir karar cunku:

- payload kuculur
- sadece kullanilan veri gelir
- mapping daha kontrollu olur

## 3.3 Canonical mapping

### Dosya: `apps/api/src/modules/locations/google/google-location.helpers.ts`

```ts
function normalizeLocationText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCanonicalName(value: string): string {
  return normalizeLocationText(value).toLocaleUpperCase("tr-TR");
}
```

Konum yazilarinda:

- trim
- fazla bosluk temizligi
- Turkish locale upper-case

yapiliyor.

### Ayni dosya

```ts
const districtComponent =
  findComponent(response.addressComponents, ["administrative_area_level_2"]) ??
  findComponent(response.addressComponents, ["sublocality_level_1"]) ??
  findComponent(response.addressComponents, ["locality"]);
const cityComponent =
  findComponent(response.addressComponents, ["administrative_area_level_1"]) ??
  findComponent(response.addressComponents, ["locality"]) ??
  districtComponent;

const city = normalizeCanonicalName(cityComponent?.longText ?? displayText);
const district = districtComponent?.longText
  ? normalizeCanonicalName(districtComponent.longText)
  : null;
```

Yani Google Place Details response'undan:

- sehir
- ilce
- gorunecek konum metni
- lat/lng

ayristiriliyor.

### Ayni dosya

```ts
return {
  provider: "google",
  placeId,
  konumMetni: displayText,
  sehir: city,
  ilce: district,
  lat: latitude,
  lng: longitude,
};
```

Uygulamanin ic canonical konum modeli budur.

## 3.4 Routes API

### Dosya: `apps/api/src/modules/locations/google/google-route.engine.ts`

```ts
const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
  },
  body: JSON.stringify({
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    intermediates: waypoints.map((waypoint) => ({
      location: {
        latLng: {
          latitude: waypoint.lat,
          longitude: waypoint.lng,
        },
      },
    })),
    travelMode: "DRIVE",
    languageCode: defaultLanguageCode,
  }),
});
```

Bu engine ne donduruyor:

- `distanceMeters`
- `durationSeconds`

### Ayni dosya

```ts
return {
  distanceMeters: route.distanceMeters,
  durationSeconds: Number.isNaN(durationSeconds) ? 0 : durationSeconds,
};
```

## Routes engine su an projede aktif kullaniliyor mu

Kod taramasina gore:

- `LocationsService.getRouteMetrics()` var
- `GoogleRouteEngine` implementasyonu var
- ama feature akislarda su an cagrilan bir yer yok

Yani:

- altyapi var
- ama musteri veya nakliyeci UI/feature seviyesinde henuz route-aware karar motoru acilmis degil

Bu cok onemli bir ayrim.

---

# 4. API Yuzeyi

## Controller

### Dosya: `apps/api/src/modules/locations/locations.controller.ts`

```ts
@Controller("locations")
@UseGuards(JwtAuthGuard)
export class LocationsController {
```

Bu kritik cunku:

- endpoint'ler auth korumali
- ama rol bazli ayrim yok
- yani backend perspektifinden hem musteri hem nakliyeci bu endpoint'leri kullanabilir

Su an repoda frontend tarafinda aktif kullanan ekranlar agirlikla musteri ekranlari.

## Endpoint 1: autocomplete

### Dosya: `apps/api/src/modules/locations/locations.controller.ts`

```ts
@Get("autocomplete")
async autocomplete(
  @CurrentUser() _currentUser: AuthenticatedUser,
  @Query() query: LocationAutocompleteQueryDto
): Promise<LocationSuggestionResponseDto[]> {
  return this.locationsService.autocomplete(query.q, query.sessionToken);
}
```

### Query DTO

### Dosya: `apps/api/src/modules/locations/dto/location-autocomplete-query.dto.ts`

```ts
export class LocationAutocompleteQueryDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  q!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(36)
  sessionToken?: string;
}
```

Not:

- frontend 2 karakterde request atmaya baslasa bile backend DTO minimum `3` istiyor
- yani final kabul noktasi backend validation

## Endpoint 2: place details

### Dosya: `apps/api/src/modules/locations/locations.controller.ts`

```ts
@Get("places/:placeId")
async getPlaceDetails(
  @CurrentUser() _currentUser: AuthenticatedUser,
  @Param("placeId") placeId: string,
  @Query("sessionToken") sessionToken?: string
): Promise<CanonicalLocationResponseDto> {
  return this.locationsService.getPlaceDetails(placeId, sessionToken);
}
```

### Response DTO

### Dosya: `apps/api/src/modules/locations/dto/canonical-location-response.dto.ts`

```ts
export class CanonicalLocationResponseDto {
  provider!: string;
  placeId!: string;
  konumMetni!: string;
  sehir!: string;
  ilce!: string | null;
  lat!: number;
  lng!: number;
}
```

Bu response frontend'e sunlari verir:

- provider
- placeId
- ekranda gosterecegi konum metni
- sehir
- ilce
- koordinatlar

---

# 5. Musteri Akisi

Bu location sisteminin ana ureten tarafi musteri akisidir.

## 5.1 Frontend autocomplete component'i

### Dosya: `apps/web/src/components/LocationAutocompleteField.tsx`

```ts
const [query, setQuery] = useState(value?.konumMetni ?? "");
const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
const [sessionToken, setSessionToken] = useState(createSessionToken);
```

Component kendi icinde:

- input query state
- oneriler
- loading/error
- `sessionToken`

tutar.

## 5.2 Session token mantigi

### Dosya: `apps/web/src/components/LocationAutocompleteField.tsx`

```ts
function createSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
```

Bu token ne ise yariyor:

- ayni arama oturumu icindeki autocomplete + detail secimini bagliyor
- Google Places tarafinda arama akisini tutarli hale getiriyor

### Ayni dosya

```ts
const response = await autocompleteLocations(
  trimmed,
  accessToken,
  sessionToken
);
```

### Ayni dosya

```ts
const details = await getLocationPlaceDetails(
  suggestion.placeId,
  accessToken,
  sessionToken
);
```

Yani ayni secim dongusunde:

- autocomplete
- place details

ayni `sessionToken` ile gider.

Secim tamamlaninca token yenilenir:

```ts
setSessionToken(createSessionToken());
```

Bu da sonraki arama oturumunu ayirir.

## 5.3 Debounce mantigi

### Dosya: `apps/web/src/components/LocationAutocompleteField.tsx`

```ts
const timeoutId = window.setTimeout(async () => {
  ...
}, 250);
```

Yani her tus vurusunda aninda request atmiyor; `250ms` bekliyor.

Bu iyi cunku:

- gereksiz API cagrilari azalir
- UI daha stabil olur

## 5.4 Secim zorunlulugu

### Dosya: `apps/web/src/app/dashboard/istek_ekle/page.tsx`

```ts
if (!baslangicKonum || !varisKonum) {
  window.alert("Baslangic ve varis konumunu listeden secmelisin.");
  return;
}
```

Bu cok kritik karar:

- kullanici sadece text yazip gecemiyor
- mutlaka listeden secim yapmali
- boylece backend'e `placeId + provider` gidiyor

Yani serbest metin degil, dogrulanmis secim modeli kullaniliyor.

## 5.5 Musteri create payload'i

### Dosya: `apps/web/src/app/dashboard/istek_ekle/page.tsx`

```ts
const payload: CreateTransportRequestInput = {
  baslangicKonum: {
    provider: baslangicKonum.provider,
    placeId: baslangicKonum.placeId,
    sessionToken: baslangicKonum.sessionToken,
  },
  varisKonum: {
    provider: varisKonum.provider,
    placeId: varisKonum.placeId,
    sessionToken: varisKonum.sessionToken,
  },
  ...
};
```

Frontend ne gondermiyor:

- `lat`
- `lng`
- `sehir`
- `ilce`
- `konumMetni`

Frontend ne gonderiyor:

- `provider`
- `placeId`
- `sessionToken`

Bu da guvenli bir karar cunku canonical veri backend tarafinda tekrar resolve ediliyor.

## 5.6 Backend create validation

### Dosya: `apps/api/src/modules/locations/dto/transport-location-selection.dto.ts`

```ts
export class TransportLocationSelectionDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  provider!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  placeId!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(36)
  sessionToken?: string;
}
```

`provider`, `placeId`, `sessionToken` backend DTO seviyesinde de dogrulaniyor.

## 5.7 Backend create akisi

### Dosya: `apps/api/src/modules/transport-requests/transport-requests.service.ts`

```ts
const [baslangicKonum, varisKonum] = await Promise.all([
  this.locationsService.resolveCanonicalLocation(
    createTransportRequestDto.baslangicKonum.provider,
    createTransportRequestDto.baslangicKonum.placeId,
    createTransportRequestDto.baslangicKonum.sessionToken
  ),
  this.locationsService.resolveCanonicalLocation(
    createTransportRequestDto.varisKonum.provider,
    createTransportRequestDto.varisKonum.placeId,
    createTransportRequestDto.varisKonum.sessionToken
  ),
]);
```

Yani backend:

- her iki konumu da tekrar Google uzerinden resolve eder
- frontend'ten gelen ham metne guvenmez

Sonra DB yazimi:

```ts
const transportRequest = await this.transportRequestsRepository.create({
  musteriId: currentUser.id,
  baslangicSehri: baslangicKonum.sehir,
  varisSehri: varisKonum.sehir,
  baslangicKonumMetni: baslangicKonum.konumMetni,
  varisKonumMetni: varisKonum.konumMetni,
  baslangicProvider: baslangicKonum.provider,
  varisProvider: varisKonum.provider,
  baslangicPlaceId: baslangicKonum.placeId,
  varisPlaceId: varisKonum.placeId,
  normalizeBaslangicSehir: baslangicKonum.sehir,
  normalizeVarisSehir: varisKonum.sehir,
  normalizeBaslangicIlce: baslangicKonum.ilce,
  normalizeVarisIlce: varisKonum.ilce,
  baslangicEnlem: baslangicKonum.lat,
  baslangicBoylam: baslangicKonum.lng,
  varisEnlem: varisKonum.lat,
  varisBoylam: varisKonum.lng,
  ...
});
```

Bu create akisi location tarafinda su degerleri kalici hale getirir:

- ekranda gosterilecek metin
- canonical sehir / ilce
- place id
- provider
- koordinatlar

## 5.8 Musteri update akisi

Location update mantigi de ayni prensiple calisir.

### Dosya: `apps/api/src/modules/transport-requests/transport-requests.service.ts`

```ts
const [baslangicKonum, varisKonum] = await Promise.all([
  this.locationsService.resolveCanonicalLocation(
    updateTransportRequestDto.baslangicKonum.provider,
    updateTransportRequestDto.baslangicKonum.placeId,
    updateTransportRequestDto.baslangicKonum.sessionToken
  ),
  this.locationsService.resolveCanonicalLocation(
    updateTransportRequestDto.varisKonum.provider,
    updateTransportRequestDto.varisKonum.placeId,
    updateTransportRequestDto.varisKonum.sessionToken
  ),
]);
```

Bu sayede musteri eski kaydi duzenlerken de sistem ayni canonical modeli korur.

## 5.9 Legacy kayit davranisi

Bu repoda eski kayitlarla uyum da dusunulmus.

### Dosya: `apps/web/src/app/dashboard/isteklerim/[id]/duzenle/page.tsx`

```ts
function toSelectedLocation(
  request: TransportRequestDetail,
  direction: "baslangic" | "varis"
): SelectedLocation | null {
  const provider =
    direction === "baslangic" ? request.baslangicProvider : request.varisProvider;
  const placeId =
    direction === "baslangic" ? request.baslangicPlaceId : request.varisPlaceId;

  if (!provider || !placeId) {
    return null;
  }

  return {
    provider,
    placeId,
    konumMetni: ...,
    sehir: ...,
    ilce: ...,
    lat: ...,
    lng: ...,
  };
}
```

Eger eski kayitta `provider/placeId` yoksa secili konum otomatik kurulmaz.

### Ayni dosya

```ts
setLegacyRouteHint({
  baslangic: response.baslangicPlaceId
    ? null
    : formatLocationLabel(response.baslangicKonumMetni, response.baslangicSehri),
  varis: response.varisPlaceId
    ? null
    : formatLocationLabel(response.varisKonumMetni, response.varisSehri),
});
```

### Dosya: `apps/web/src/components/LocationAutocompleteField.tsx`

```ts
{!value && legacyHint ? (
  <p className="text-xs text-amber-700">
    Mevcut kayit: {legacyHint}. Guncellemeden once yeni konumu listeden sec.
  </p>
) : null}
```

Bu davranis ne sagliyor:

- eski kayit okunabilir kalir
- ama duzenleme yaparken kullanici yeni canonical secim yapmak zorunda olur

---

# 6. DB Tarafi

## 6.1 Temel ilke

Bu repoda location icin ayri bir `Location` tablosu yok.

Onun yerine pickup/dropoff bilgisi `Istek` tablosunun uzerinde saklaniyor.

### Dosya: `apps/api/prisma/schema.prisma`

```prisma
model Istek {
  id                      Int       @id @default(autoincrement())
  musteriId               Int
  baslangicSehri          String    @db.VarChar(100)
  varisSehri              String    @db.VarChar(100)
  baslangicKonumMetni     String?   @db.VarChar(255)
  varisKonumMetni         String?   @db.VarChar(255)
  baslangicProvider       String?   @db.VarChar(50)
  varisProvider           String?   @db.VarChar(50)
  baslangicPlaceId        String?   @db.VarChar(255)
  varisPlaceId            String?   @db.VarChar(255)
  normalizeBaslangicSehir String?   @db.VarChar(100)
  normalizeVarisSehir     String?   @db.VarChar(100)
  normalizeBaslangicIlce  String?   @db.VarChar(100)
  normalizeVarisIlce      String?   @db.VarChar(100)
  baslangicEnlem          Decimal   @db.Decimal(9, 6)
  baslangicBoylam         Decimal   @db.Decimal(9, 6)
  varisEnlem              Decimal   @db.Decimal(9, 6)
  varisBoylam             Decimal   @db.Decimal(9, 6)
  ...
}
```

## 6.2 Hangi alan neden var

- `baslangicKonumMetni` / `varisKonumMetni`
  Ekranda gosterecegi insan-dostu adres ozeti

- `baslangicProvider` / `varisProvider`
  Bu secim hangi provider ile resolve edildi

- `baslangicPlaceId` / `varisPlaceId`
  Provider tarafindaki dogrulanmis yer kimligi

- `normalizeBaslangicSehir` / `normalizeVarisSehir`
  Discovery filtreleri icin canonical sehir

- `normalizeBaslangicIlce` / `normalizeVarisIlce`
  Daha detayli canonical ilce bilgisi

- `baslangicEnlem` / `baslangicBoylam` / `varisEnlem` / `varisBoylam`
  Gelecekte route-aware hesaplar ve detay gostergeleri icin koordinatlar

## 6.3 Migration hikayesi

Burada onemli bir ayrim var:

- koordinat kolonlari aslinda ilk migration'dan beri vardi
- provider / placeId / canonical sehir-ilce gibi alanlar sonradan eklendi

### Dosya: `apps/api/prisma/migrations/20260401092528_sistem_kuruldu/migration.sql`

```sql
CREATE TABLE "Istek" (
    "id" SERIAL NOT NULL,
    "musteriId" INTEGER NOT NULL,
    "baslangicSehri" VARCHAR(100) NOT NULL,
    "varisSehri" VARCHAR(100) NOT NULL,
    "baslangicEnlem" DECIMAL(9,6) NOT NULL,
    "baslangicBoylam" DECIMAL(9,6) NOT NULL,
    "varisEnlem" DECIMAL(9,6) NOT NULL,
    "varisBoylam" DECIMAL(9,6) NOT NULL,
    ...
);
```

### Dosya: `apps/api/prisma/migrations/20260420110000_add_map_location_and_discovery_foundation/migration.sql`

```sql
ALTER TABLE "Istek"
ADD COLUMN "baslangicKonumMetni" VARCHAR(255),
ADD COLUMN "varisKonumMetni" VARCHAR(255),
ADD COLUMN "baslangicProvider" VARCHAR(50),
ADD COLUMN "varisProvider" VARCHAR(50),
ADD COLUMN "baslangicPlaceId" VARCHAR(255),
ADD COLUMN "varisPlaceId" VARCHAR(255),
ADD COLUMN "normalizeBaslangicSehir" VARCHAR(100),
ADD COLUMN "normalizeVarisSehir" VARCHAR(100),
ADD COLUMN "normalizeBaslangicIlce" VARCHAR(100),
ADD COLUMN "normalizeVarisIlce" VARCHAR(100),
...
```

Yani bugunku model:

- eski koordinat altyapisini koruyor
- ustune Google-provider ve canonical discovery katmani ekliyor

## 6.4 Repository seviyesinde yazim

### Dosya: `apps/api/src/modules/transport-requests/repositories/transport-requests.repository.ts`

```ts
await this.prisma.client.istek.create({
  data: {
    musteriId: input.musteriId,
    baslangicSehri: input.baslangicSehri,
    varisSehri: input.varisSehri,
    baslangicKonumMetni: input.baslangicKonumMetni,
    varisKonumMetni: input.varisKonumMetni,
    baslangicProvider: input.baslangicProvider,
    varisProvider: input.varisProvider,
    baslangicPlaceId: input.baslangicPlaceId,
    varisPlaceId: input.varisPlaceId,
    normalizeBaslangicSehir: input.normalizeBaslangicSehir,
    normalizeVarisSehir: input.normalizeVarisSehir,
    normalizeBaslangicIlce: input.normalizeBaslangicIlce,
    normalizeVarisIlce: input.normalizeVarisIlce,
    baslangicEnlem: new Prisma.Decimal(input.baslangicEnlem),
    baslangicBoylam: new Prisma.Decimal(input.baslangicBoylam),
    varisEnlem: new Prisma.Decimal(input.varisEnlem),
    varisBoylam: new Prisma.Decimal(input.varisBoylam),
    ...
  },
});
```

Yani DB tarafinda location verisi request'in bir parcasi olarak kalici hale geliyor.

---

# 7. Nakliyeci Akisi

## En onemli gercek

Nakliyeci tarafinda su an Google autocomplete ile kendi rota / servis alani / operasyon bolgesi secimi yok.

Su anki durum:

- nakliyeci, musteri tarafinda dogrulanmis location verisini tuketiyor
- discovery filtresinde sehir bazli filtre uyguluyor
- request detail ekraninda canonical veriyi goruyor

Bu ayrimi net koymak lazim.

## 7.1 Discovery filtresi Google Places kullanmiyor

### Dosya: `apps/web/src/app/dashboard/acik_istekler/page.tsx`

```ts
import CitySelectField from "@/components/CitySelectField";
import { TURKEY_CITY_OPTIONS } from "@/lib/turkey-cities";
```

### Ayni dosya

```tsx
<CitySelectField
  id="baslangicSehir"
  label="Baslangic sehri"
  options={TURKEY_CITY_OPTIONS}
  placeholder="Il sec"
  value={filters.baslangicSehir}
  ...
/>
<CitySelectField
  id="varisSehir"
  label="Varis sehri"
  options={TURKEY_CITY_OPTIONS}
  placeholder="Il sec"
  value={filters.varisSehir}
  ...
/>
```

Bu filtre paneli:

- Google autocomplete degil
- 81 il secimi
- canonical city value gonderme mantigi

Yani nakliyeci discovery sayfasinda Google API cagrisi yapilmiyor.

### Dosya: `apps/web/src/lib/turkey-cities.ts`

```ts
export const TURKEY_CITY_OPTIONS: TurkeyCityOption[] = [
  { label: "Adana", value: "ADANA" },
  ...
  { label: "Istanbul", value: "ISTANBUL" },
];
```

Bu secimlerin `value` tarafi canonical sehir degeri.

## 7.2 Backend'de nakliyeci discovery nasil filtreliyor

### Dosya: `apps/web/src/app/dashboard/acik_istekler/page.tsx`

```ts
function toApiFilters(values: DiscoveryFilterForm): OpenOfferRequestFilters {
  return {
    baslangicSehir: values.baslangicSehir.trim() || undefined,
    varisSehir: values.varisSehir.trim() || undefined,
    ...
  };
}
```

### Dosya: `apps/api/src/modules/offers/repositories/offers.repository.ts`

```ts
if (filters.baslangicSehir) {
  andFilters.push({
    OR: [
      {
        normalizeBaslangicSehir: {
          equals: filters.baslangicSehir,
        },
      },
      {
        baslangicSehri: {
          equals: filters.baslangicSehir,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    ],
  });
}
```

### Ayni dosya

```ts
if (filters.varisSehir) {
  andFilters.push({
    OR: [
      {
        normalizeVarisSehir: {
          equals: filters.varisSehir,
        },
      },
      {
        varisSehri: {
          equals: filters.varisSehir,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    ],
  });
}
```

Bu yapinin anlami:

- once yeni canonical alanlara bakar
- eski kayitlar varsa legacy sehir alanlarina fallback yapar

Yani nakliyeci discovery:

- musteri tarafinda olusan dogrulanmis sehir verisini kullanir
- ama kendisi Google Places ile yeni konum secmez

## 7.3 Nakliyeci detail ekraninda hangi location verisi goruluyor

Open request detail response location'in daha zengin halini tasir.

### Dosya: `apps/api/src/modules/offers/offers.service.ts`

```ts
private toOpenRequestDetailResponse(
  request: OpenRequestDetailRecord
): OpenRequestDetailResponseDto {
  return {
    ...this.toOpenRequestListItemResponse(request),
    baslangicProvider: request.baslangicProvider,
    varisProvider: request.varisProvider,
    baslangicPlaceId: request.baslangicPlaceId,
    varisPlaceId: request.varisPlaceId,
    normalizeBaslangicSehir: request.normalizeBaslangicSehir,
    normalizeVarisSehir: request.normalizeVarisSehir,
    normalizeBaslangicIlce: request.normalizeBaslangicIlce,
    normalizeVarisIlce: request.normalizeVarisIlce,
    baslangicEnlem: request.baslangicEnlem,
    baslangicBoylam: request.baslangicBoylam,
    varisEnlem: request.varisEnlem,
    varisBoylam: request.varisBoylam,
    hasActiveVehicle: false,
    hasExistingOffer: request.hasExistingOffer,
  };
}
```

Yani nakliyeci detail endpoint'inde sadece sehir ismi yok:

- provider
- placeId
- canonical sehir / ilce
- koordinatlar

da var.

Frontend detail ekrani bunlari okur ve gosterir:

### Dosya: `apps/web/src/app/dashboard/acik_istekler/[id]/page.tsx`

UI tarafinda su alanlar gorunur:

- `baslangicKonumMetni`
- `varisKonumMetni`
- `normalizeBaslangicSehir`
- `normalizeVarisSehir`
- `normalizeBaslangicIlce`
- `normalizeVarisIlce`

Yani nakliyeci tarafi bugun harita uretmiyor ama dogrulanmis location datayi okuyabiliyor.

## 7.4 Nakliyeci icin route engine su an ne durumda

Route engine mevcut ama nakliyeciye acilmis akislarda aktif degil.

Yani su an yok:

- nakliyecinin kendi servis hatti
- benim rotama su kadar yakin istekler
- ekstra km / ekstra sure hesabi
- pickup/dropoff route uyumu skoru

Ama su var:

- bu hesaplarin altyapisini kurabilecek `RouteEngine` contract'i
- koordinat verisi
- canonical request location modeli

Bu nedenle sistem su an "route-ready foundation" asamasinda denebilir.

---

# 8. Frontend API Katmani

## Location API wrapper

### Dosya: `apps/web/src/lib/api/locations.ts`

```ts
export function autocompleteLocations(
  query: string,
  accessToken: string,
  sessionToken?: string
) {
  const searchParams = new URLSearchParams();
  searchParams.set("q", query);

  if (sessionToken) {
    searchParams.set("sessionToken", sessionToken);
  }

  return apiFetch<LocationSuggestion[]>(
    `/locations/autocomplete?${searchParams.toString()}`,
    {
      method: "GET",
      accessToken,
    }
  );
}
```

### Ayni dosya

```ts
export function getLocationPlaceDetails(
  placeId: string,
  accessToken: string,
  sessionToken?: string
) {
  const searchParams = new URLSearchParams();

  if (sessionToken) {
    searchParams.set("sessionToken", sessionToken);
  }

  const suffix = searchParams.toString();
  const path = suffix
    ? `/locations/places/${encodeURIComponent(placeId)}?${suffix}`
    : `/locations/places/${encodeURIComponent(placeId)}`;

  return apiFetch<CanonicalLocation>(path, {
    method: "GET",
    accessToken,
  });
}
```

Bu wrapper'larin guzel yani:

- Google endpoint'i browser'dan direkt cagrilmiyor
- browser yalnizca kendi backend'ini goruyor
- API key backend'de kaliyor

Bu, mimari olarak dogru karar.

---

# 9. Mevcut Sistemin Rol Bazli Ozeti

## Musteri icin su an var

- Google Places autocomplete
- Google Place Details ile secim dogrulama
- canonical sehir / ilce uretimi
- provider + placeId + lat/lng yazimi
- create ve update akisi
- legacy kayitlari duzenlerken yeni secim zorlugu

## Nakliyeci icin su an var

- acik istekleri sehir bazli filtreleme
- request detail'de canonical location verisini gorme
- musteri tarafinda dogrulanmis location bilgisi uzerinden teklif verme

## Nakliyeci icin su an yok

- Google autocomplete ile kendi operasyon bolgesi tanimi
- kendi rota planini kaydetme
- route-aware otomatik discovery
- ekstra km / ekstra sure hesabina gore siralama
- canli harita veya pin tabanli UI

## Backend seviyesinde her iki rol icin teknik olarak ortak ne var

- `GET /locations/autocomplete`
- `GET /locations/places/:placeId`

Bu endpoint'ler `JwtAuthGuard` ile korunuyor ama rol bazli sinirli degil.

Yani:

- backend teorik olarak her iki role de acik
- repo icindeki aktif UI kullanimi ise esas olarak musteri tarafinda

---

# 10. Neden Bu Tasarim Mantikli

Bu repo acisindan bu tasarimin guclu taraflari:

## 1. Frontend serbest text'e guvenmiyor

`placeId` gonderiyor, canonical veriyi backend kuruyor.

## 2. API key frontend'e sizmiyor

Google cagrilari backend proxy/provider uzerinden gidiyor.

## 3. Discovery filtresi sade tutulmus

Nakliyeci discovery icin gereksiz yere Google Places bagimliligi eklenmemis.

## 4. Gelecege acik

`LocationProvider` ve `RouteEngine` kontratlari ileride yeni provider veya route-aware matching icin alan birakiyor.

## 5. Legacy uyumu dusunulmus

Eski kayitlar tamamen kirilmiyor; ama yeni duzenleme akisi canonical modele dogru zorluyor.

---

# 11. Su Anki Sinirlar ve Bilincli Eksikler

Repo gercegine gore su eksikler bilincli:

- musteri icin ayri adres defteri yok
- nakliyeci icin ayri rota / hizmet alani tablosu yok
- `LocationsService.getRouteMetrics()` feature akislarda aktif kullanilmiyor
- carrier tarafinda Google autocomplete ile lokasyon secimi yok
- koordinatlar var ama harita komponenti veya route skorlamasi yok
- discovery siralamasi route-aware degil

Bu eksikler "yanlis tasarim" degil; su anki faz siniri.

---

# 12. Sonuc

Bu repoda `location` ozelligi bugun en dogru sekliyle sunu yapiyor:

- musteri pickup/dropoff noktasini Google Places ile dogrulanmis sekilde seciyor
- backend bu secimi canonical veriye cevirip `Istek` ustunde sakliyor
- nakliyeci de bu dogrulanmis veriyi filtreleme ve detay gorme amaciyla kullaniyor

Yani sistem bugun:

- location capture konusunda olgun
- location persistence konusunda request-merkezli
- carrier route intelligence konusunda ise foundation asamasinda

En kisa teknik ozet:

> Google Places musteri tarafinda veri uretmek icin kullaniliyor; nakliyeci tarafinda ise bugun esas olarak bu uretilmis veriyi okuyan ve sehir bazli filtreleyen bir model var. Route engine mevcut ama henuz urun akisina tam baglanmis degil.

