# Amac

Bu dokuman, projedeki asagidaki konulari tek yerde toplar:

1. Access token + refresh token akisi ve `api-client.ts` icindeki duzeltilmis mekanizma
2. Plaka + soft delete + unique problemi nasil cozuldu
3. Dependency injection, manual injection ve Java nesne mantiginin NestJS karsiligi
4. Nest provider scope mantigi: singleton / transient
5. State management, `use client`, `useState`, `useEffect`, `useSyncExternalStore`
6. Mevcut sisteme 30 dakika pasiflik timeout'u nasil eklenebilir

Not: 2. maddede kullanici tarafinda "backendde sorgu ile yapiyoruz" gibi bir algi olabilir. Repo koduna bakinca mevcut garanti sadece uygulama sorgusu ile degil, veritabani seviyesindeki partial unique index + backend hata esleme kombinasyonu ile saglaniyor.

---

# 1. Access Token + Refresh Token Mekanizmasi

## Kavram

- `access token`: kisa omurlu, API cagrilarinda `Authorization: Bearer ...` olarak giden token
- `refresh token`: access token suresi dolunca yeni token ciftini almak icin kullanilan daha uzun omurlu token
- Amaç: kullaniciyi her 15 dakikada bir yeniden login yaptirmamak

Bu projede su TTL degerleri kullaniliyor:

### Dosya: `apps/api/src/config/auth.config.ts`

```ts
export default registerAs("auth", () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
  accessTtl: (process.env.JWT_ACCESS_TTL ?? "15m") as JwtTtlValue,
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
  refreshTtl: (process.env.JWT_REFRESH_TTL ?? "7d") as JwtTtlValue,
}));
```

Yani su an sistem mantigi:

- access token: `15m`
- refresh token: `7d`

## Backend token uretimi

### Dosya: `apps/api/src/modules/auth/auth.service.ts`

```ts
private async createTokenPair(user: AuthUserRecord): Promise<AuthTokenResponseDto> {
  const accessPayload: AccessTokenPayload = {
    sub: user.id,
    mail: user.mail,
    kullaniciAdi: user.kullaniciAdi,
    roles: user.roles,
  };

  const refreshPayload: RefreshTokenPayload = {
    sub: user.id,
    type: "refresh",
  };

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(accessPayload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl,
    }),
    this.jwtService.signAsync(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtl,
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
  };
}
```

Burada dikkat edilmesi gereken nokta:

- login ve register sonunda token cifti uretiliyor
- refresh endpoint'i de yeni bir token cifti donduruyor

### Dosya: `apps/api/src/modules/auth/auth.controller.ts`

```ts
@Post("refresh")
@HttpCode(HttpStatus.OK)
refresh(@Body() refreshDto: RefreshDto): Promise<AuthTokenResponseDto> {
  return this.authService.refresh(refreshDto.refreshToken);
}
```

### Dosya: `apps/api/src/modules/auth/auth.service.ts`

```ts
async refresh(refreshToken: string): Promise<AuthTokenResponseDto> {
  let payload: RefreshTokenPayload;

  try {
    payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
      secret: this.refreshSecret,
    });
  } catch {
    throw new UnauthorizedException("Invalid refresh token.");
  }

  if (payload.type !== "refresh") {
    throw new UnauthorizedException("Invalid refresh token.");
  }

  const user = await this.usersService.findActiveById(payload.sub);

  if (!user) {
    throw new UnauthorizedException("Invalid refresh token.");
  }

  return this.createTokenPair(user);
}
```

Bu backend akisinda refresh token:

- imza olarak dogrulaniyor
- `type: "refresh"` kontrolu yapiliyor
- kullanici hala aktif mi kontrol ediliyor
- gecerliyse yeni access + refresh cifti uretiliyor

## Frontend tarafinda tokenlarin saklanmasi

### Dosya: `apps/web/src/lib/auth/auth-storage.ts`

```ts
export type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  user?: StoredAuthUser;
};

export function setStoredAuth(auth: StoredAuth) {
  const rawAuth = JSON.stringify(auth);
  window.localStorage.setItem(AUTH_STORAGE_KEY, rawAuth);
  cachedAuthRawValue = rawAuth;
  cachedStoredAuth = auth;
  emitAuthChange();
}
```

Yani web tarafinda tokenlar su an `localStorage` icinde tutuluyor.

## `api-client.ts` duzeltmesinden once durum

Bir onceki halde `apiFetch()` sadece request atiyordu. 401 donerse hatayi oldugu gibi yukari firlatiyordu.

### Onceki mantik ozeti

### Dosya: `apps/web/src/lib/api/api-client.ts` onceki hali

```ts
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { accessToken, headers, ...init } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiClientError(response.status, message, errorBody);
  }

  return response.json() as Promise<T>;
}
```

Bu yapida sorun su:

- access token suresi dolarsa API `401` donuyor
- ama frontend otomatik `/auth/refresh` cagrisi yapmiyor
- yani refresh token elde olsa bile kullanilmiyordu

## `api-client.ts` duzeltmesinden sonra mekanizma

### Dosya: `apps/web/src/lib/api/api-client.ts`

```ts
let refreshRequestPromise: Promise<string | null> | null = null;
```

Bu satir, ayni anda birden fazla request 401 alirsa her birinin ayri ayri refresh atmasini engelliyor.

### Dosya: `apps/web/src/lib/api/api-client.ts`

```ts
async function refreshAccessToken(): Promise<string | null> {
  const storedAuth = getStoredAuth();

  if (!storedAuth?.refreshToken) {
    clearStoredAuth();
    return null;
  }

  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  refreshRequestPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: storedAuth.refreshToken,
        }),
        cache: "no-store",
      });

      const refreshedAuth = await parseApiResponse<StoredAuth>(response);
      const nextAuth: StoredAuth = {
        ...storedAuth,
        ...refreshedAuth,
        user: refreshedAuth.user ?? storedAuth.user,
      };

      setStoredAuth(nextAuth);
      return nextAuth.accessToken;
    } catch {
      clearStoredAuth();
      return null;
    } finally {
      refreshRequestPromise = null;
    }
  })();

  return refreshRequestPromise;
}
```

Bu mekanizmanin kritik noktalar:

1. `localStorage` icinden mevcut `refreshToken` okunuyor
2. refresh token yoksa auth temizleniyor
3. refresh zaten devam ediyorsa ayni promise tekrar kullaniliyor
4. `/auth/refresh` endpoint'ine POST atiliyor
5. yeni token cifti gelirse `setStoredAuth(nextAuth)` ile localStorage guncelleniyor
6. `user` alani refresh response'ta yoksa eski `user` korunuyor
7. refresh basarisizsa auth temizleniyor

### Dosya: `apps/web/src/lib/api/api-client.ts`

```ts
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  try {
    return await performFetch<T>(path, options);
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.status !== 401 ||
      !options.accessToken ||
      path === "/auth/refresh"
    ) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();

    if (!refreshedAccessToken) {
      throw error;
    }

    return performFetch<T>(path, options, refreshedAccessToken);
  }
}
```

Buradaki akil yuruten kisim:

- request normal gider
- eger `401` alirsa hemen logout yapmaz
- once refresh token ile yeni access token almaya calisir
- basarili olursa ayni request'i yeni token ile tekrar eder
- sadece refresh de fail olursa hata yukari cikar

## Login sonrasi ilk saklama noktasi

### Dosya: `apps/web/src/app/login/page.tsx`

```ts
const response = await apiFetch<StoredAuth>("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    identifier: form.identifier,
    password: form.password,
  }),
});

setStoredAuth(response);
router.replace("/");
```

Yani login sonrasi tokenlar `setStoredAuth(response)` ile saklaniyor, daha sonra tum auth isteyen istekler `apiFetch` + `accessToken` kombinasyonu ile gidiyor.

## Bu mekanizmanin net ozeti

- Backend token ciftini uretiyor
- Frontend token ciftini `localStorage`'da sakliyor
- Auth isteyen request'ler `Authorization` header ile gidiyor
- Access token biterse `api-client.ts` refresh akisini devreye sokuyor
- Yeni access token alininca ayni request tekrar deneniyor

---

# 2. Plaka + Soft Delete + Unique Problemi Nasil Cozuldu

## Problem

`Arac` tablosunda soft delete var:

- kayit tamamen silinmiyor
- `silmeTarihi` dolduruluyor

Eger `plaka` alaninda normal `UNIQUE` kalsaydi, silinmis bir arac kaydi veritabaninda durmaya devam edecegi icin ayni plaka tekrar kullanilamazdi.

## Schema tarafinda ne degisti

### Dosya: `apps/api/prisma/schema.prisma`

```prisma
model Arac {
  id              Int       @id @default(autoincrement())
  plaka           String    @db.VarChar(20)
  silmeTarihi     DateTime?
}
```

Burada dikkat:

- `plaka` artik `@unique` degil
- bunun yerine soft delete ile uyumlu ayri bir index mantigi var

## Asil cozum: partial unique index

### Dosya: `apps/api/prisma/migrations/20260417071918_add_soft_delete_to_vehicles_and_transport_requests/migration.sql`

```sql
DROP INDEX "Arac_plaka_key";

ALTER TABLE "Arac" ADD COLUMN "silmeTarihi" TIMESTAMP(3);

CREATE UNIQUE INDEX "Arac_plaka_active_unique"
ON "Arac" ("plaka")
WHERE "silmeTarihi" IS NULL;
```

Bu cozumun anlami:

- ayni plaka iki aktif aracta olamaz
- ama `silmeTarihi` dolu, yani soft delete olmus kayitlar bu unique kontrolden dislanir
- boylece silinmis plaka tekrar kullanilabilir

### Dosya: `apps/arac_plaka_active_unique_fix.sql`

```sql
DROP INDEX IF EXISTS "Arac_plaka_key";
DROP INDEX IF EXISTS "Arac_plaka_active_unique";

CREATE UNIQUE INDEX "Arac_plaka_active_unique"
ON "Arac" ("plaka")
WHERE "silmeTarihi" IS NULL;
```

Bu SQL dosyasi ayni mantigin duzeltme / elle uygulama versiyonu.

## Backend tarafinda aktif kayit sorgulari

Burada ikinci katman aktif kayitlari her zaman `silmeTarihi: null` ile calistirmak.

### Dosya: `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

```ts
async softDeleteByIdAndOwnerId(id: number, sahipId: number): Promise<boolean> {
  const result = await this.prisma.client.arac.updateMany({
    where: {
      id,
      sahipId,
      silmeTarihi: null,
    },
    data: {
      silmeTarihi: new Date(),
    },
  });

  return result.count > 0;
}
```

### Dosya: `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

```ts
async findManyByOwnerId(sahipId: number): Promise<StoredVehicleRecord[]> {
  const vehicles = await this.prisma.client.arac.findMany({
    where: {
      sahipId,
      silmeTarihi: null,
    },
    orderBy: [{ id: "desc" }],
    select: vehicleSelect,
  });

  return vehicles.map((vehicle) => this.mapStoredVehicle(vehicle));
}
```

Yani uygulama tarafinda aktif arac kavrami her yerde `silmeTarihi: null` ile temsil ediliyor.

## Plaka normalizasyonu

### Dosya: `apps/api/src/modules/vehicles/vehicle-write.helpers.ts`

```ts
export function normalizeVehiclePlate(value: string): string {
  return normalizeVehicleCanonicalText(value);
}

export function normalizeVehicleDraft(input: VehicleDraft): NormalizedVehicleDraft {
  return {
    marka: normalizeVehicleCanonicalText(input.marka),
    model: normalizeVehicleCanonicalText(input.model),
    plaka: normalizeVehiclePlate(input.plaka),
    yil: input.yil,
    maksimumAgirlikKg: input.maksimumAgirlikKg,
    maksimumHacimM3: input.maksimumHacimM3,
    kasaTipi: normalizeVehicleCanonicalText(input.kasaTipi),
  };
}
```

Bu sayede:

- `34 abc 123`
- `34 ABC 123`
- ` 34 abc 123 `

ayni canonical forma yakinsar.

## Backend hata esleme mantigi

Plaka cakisinca su an once "manuel select ile plaka var mi" diye kontrol edilmiyor. Asil garanti DB index'ten geliyor. Backend tarafi da gelen `P2002` hatasini kullanici dostu mesaja ceviriyor.

### Dosya: `apps/api/src/modules/vehicles/vehicles.service.ts`

```ts
private rethrowUniquePlateAsConflict(error: unknown): never | void {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return;
  }

  const targets = Array.isArray(error.meta?.target)
    ? error.meta.target.map((target) => String(target))
    : [];

  if (isVehiclePlateUniqueConstraintTarget(targets)) {
    throw new ConflictException("Vehicle plate is already in use.");
  }

  throw new ConflictException("Vehicle identifiers must be unique.");
}
```

### Dosya: `apps/api/src/modules/vehicles/vehicle-write.helpers.ts`

```ts
export function isVehiclePlateUniqueConstraintTarget(targets: string[]): boolean {
  return targets.some((target) => {
    const normalizedTarget = target.trim().toLowerCase();

    return (
      normalizedTarget.includes("plaka") ||
      normalizedTarget.includes("arac_plaka_active_unique")
    );
  });
}
```

## Bu basligin net sonucu

Su anki sistemde plaka problemi su kombinasyonla cozuluyor:

1. `schema.prisma` icinde `plaka` alanindan klasik `@unique` kalkti
2. migration ve SQL fix ile `WHERE silmeTarihi IS NULL` partial unique index eklendi
3. repository katmani aktif kayitlari `silmeTarihi: null` ile sorguluyor
4. service katmani DB unique hatasini `ConflictException` olarak anlamli mesaja ceviriyor

Yani "sadece query ile cozuldu" demek eksik kalir. Dogru ifade:

> Aktif kayit filtreleri sorguda, benzersizlik garantisi ise esas olarak veritabani partial unique index'inde.

---

# 3. Dependency Injection, Manual Injection ve Java Nesne Mantigi

## Kavramlar

### Dependency

Bir class'in calismak icin ihtiyac duydugu dis sey.

Ornek:

- `PrismaService`
- `ConfigService`
- `RolesRepository`
- `JwtService`

### Injection

Bu bagimliligin bir class'a verilmesi.

### Dependency Injection (DI)

Class bagimliligini kendi icinde `new` ile olusturmaz; disaridan alir.

### "Normal injection" diye resmi bir terim var mi?

Genelde hayir. Guncel ve daha dogru terimler:

- `manual instantiation`
- `manual wiring`
- `constructor injection`
- `dependency injection`

Kisaca:

- class kendi icinde `new` geciyorsa: bu DI degil, dogrudan nesne olusturma
- class constructor ile bagimlilik aliyorsa ve bunu Nest container veriyorsa: bu DI

## Java mantigi ile benzerlik

Java / Spring tarafinda dusunce su olur:

```java
@Service
public class RolesService {
  private final RolesRepository rolesRepository;

  public RolesService(RolesRepository rolesRepository) {
    this.rolesRepository = rolesRepository;
  }
}
```

NestJS'teki karsiligi cok benzer:

### Dosya: `apps/api/src/modules/roles/roles.service.ts`

```ts
@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}
}
```

Mantik ayni:

- sinif var
- constructor var
- dis bagimlilik constructor'dan giriyor
- nesneyi framework container yonetiyor

## Projedeki DI ornekleri

### Ornek 1: Basit constructor injection

#### Dosya: `apps/api/src/modules/roles/roles.repository.ts`

```ts
@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}
}
```

#### Dosya: `apps/api/src/modules/roles/roles.service.ts`

```ts
@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}
}
```

Burada zincir:

- `RolesRepository` -> `PrismaService`'e bagimli
- `RolesService` -> `RolesRepository`'ye bagimli
- Nest bunlari `new` ile elle kurdurmuyor; container kendi bagliyor

### Ornek 2: `AuthService` icinde coklu dependency injection

#### Dosya: `apps/api/src/modules/auth/auth.service.ts`

```ts
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}
}
```

Burada `AuthService` kendi icinde:

- `new UsersService()`
- `new RolesService()`
- `new JwtService()`

yapmiyor. Hepsini Nest veriyor. Bu DI'dir.

### Ornek 3: Token bazli / factory bazli injection

Bu proje icindeki en temiz DI orneklerinden biri `LocationsModule`.

#### Dosya: `apps/api/src/modules/locations/locations.module.ts`

```ts
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
}
```

Bu ne yapiyor:

- somut class'i dogrudan her yerde kullanmak yerine token uzerinden bagimlilik veriyor
- config'e gore hangi provider secilecek module seviyesinde karar veriliyor

#### Dosya: `apps/api/src/modules/locations/locations.service.ts`

```ts
@Injectable()
export class LocationsService {
  constructor(
    @Inject(LOCATION_PROVIDER)
    private readonly locationProvider: LocationProvider,
    @Inject(ROUTE_ENGINE)
    private readonly routeEngine: RouteEngine
  ) {}
}
```

Burada class somut `GoogleLocationProvider`'a degil, interface benzeri contract + token'a bagli.

Bu, DI'nin asil faydasini gosterir:

- degistirilebilirlik
- test kolayligi
- modulerlik

## Projedeki manual object creation ornekleri

DI olmayan, normal nesne olusturma ornekleri de var.

### Dosya: `apps/api/src/main.ts`

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  })
);
```

Burada `ValidationPipe` dogrudan `new` ile olusturuluyor.

### Dosya: `apps/api/src/infrastructure/prisma/prisma.service.ts`

```ts
if (!this.prismaClient) {
  this.prismaClient = new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
  });
}
```

Burada da `PrismaClient` nesnesi `PrismaService` icinde manuel olusturuluyor.

Ama sonrasinda `PrismaService` kendisi DI ile diger siniflara veriliyor. Yani:

- `PrismaClient` olusturma: manual
- `PrismaService` dagitimi: DI

## Frontend tarafinda "injection" nasil gorunuyor

Frontend tarafinda Nest benzeri container yok. Daha cok manual passing var.

### Dosya: `apps/web/src/app/dashboard/tekliflerim/page.tsx`

```ts
const { accessToken, status } = useCarrierPageAccess();
const response = await getMyOffers(accessToken);
```

Burada `accessToken`:

- hook'tan geliyor
- sonra API fonksiyonuna parametre olarak geciliyor

Bu da bir bagimliligi disaridan verme mantigidir, ama Nest'teki container DI ile ayni sey degildir.

---

# 4. Nest'te Singleton ve Transient Mantigi

## Terminoloji notu

Sorudaki "single transit" ifadesinin Nest tarafindaki dogru karsiliklari genelde sunlardir:

- `singleton`
- `transient`
- `request-scoped`

## Singleton nedir

Varsayilan provider scope'tur. Bir provider icin uygulama konteynerinde genelde tek instance kullanilir.

Bu projede provider'larin cogu boyle.

### Dosya: `apps/api/src/modules/auth/auth.module.ts`

```ts
@Module({
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}
```

### Dosya: `apps/api/src/modules/notifications/notifications.module.ts`

```ts
@Module({
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsPublisher,
    RolesGuard,
  ],
})
export class NotificationsModule {}
```

Bu provider'larda `scope` belirtilmedigi icin Nest default olarak singleton davranir.

## Bu projedeki net singleton ornegi: `PrismaService`

### Dosya: `apps/api/src/infrastructure/prisma/prisma.module.ts`

```ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Dosya: `apps/api/src/infrastructure/prisma/prisma.service.ts`

```ts
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private prismaClient: PrismaClient | null = null;

  get client(): PrismaClient {
    if (!this.prismaClient) {
      this.prismaClient = new PrismaClient({
        adapter: new PrismaPg(databaseUrl),
      });
    }

    return this.prismaClient;
  }
}
```

Bu kombinasyon su anlama gelir:

- `PrismaService` global kullanima acik
- kendi icinde tek `PrismaClient` instance'i lazily create ediyor
- repo genelinde tekrar tekrar ayni servisten yararlaniliyor

Bu, singleton mantiginin projedeki en iyi ornegidir.

## Transient nedir

`Scope.TRANSIENT` kullanildiginda provider her inject edildiginde yeni instance uretilir.

Ornek kavram:

- log context'i farkli olacak hafif nesneler
- state tasiyan, kisa omurlu helper provider'lar

## Bu projede transient var mi

Repo taramasinda su kullanimlar bulunmadi:

- `Scope.TRANSIENT`
- `Scope.REQUEST`
- `scope: Scope...`

Yani bu projede explicit transient provider kullanimi yok. Mevcut provider yapisi agirlikli olarak default singleton.

## Sonuc

- projede kullanilan ana scope: `singleton`
- explicit `transient` ornegi: yok
- explicit `request-scoped` ornegi: yok

---

# 5. State Management ve `use client`

## Bu projede hangi state management yapisi kullaniliyor

Bu projede su an:

- Redux yok
- Zustand yok
- MobX yok
- global state kutuphanesi yok

### Dosya: `apps/web/package.json`

```json
{
  "dependencies": {
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

Yani state management daha cok su kombinasyonla yapiliyor:

1. local component state: `useState`
2. side effect / fetch / redirect: `useEffect`
3. browser storage tabanli paylasilan auth state: `localStorage`
4. bu storage'i React'e baglamak icin: `useSyncExternalStore`

## `use client` ne yapiyor

Bu repodaki Next 16 local docs'a gore:

### Dosya: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`

Anlam olarak:

- component'i client side icin entry point yapar
- state management, event handling ve browser API kullanan dosyalarda gerekir
- dosyanin en ustunde, import'lardan once yazilmalidir

## Projedeki `use client` ornekleri

### Dosya: `apps/web/src/app/login/page.tsx`

```ts
"use client";
```

### Dosya: `apps/web/src/app/dashboard/tekliflerim/page.tsx`

```ts
"use client";
```

### Dosya: `apps/web/src/lib/auth/auth-storage.ts`

```ts
"use client";
```

Sebep:

- `window`
- `localStorage`
- `useState`
- `useEffect`
- `useRouter`

gibi browser tarafina ozel seyler kullaniyorlar.

## Local state ornegi: `useState`

### Dosya: `apps/web/src/app/login/page.tsx`

```ts
const [form, setForm] = useState({
  identifier: "",
  password: "",
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [isCheckingAuth, setIsCheckingAuth] = useState(true);
```

Bu state'ler sadece login sayfasina ait local UI state.

### Dosya: `apps/web/src/app/dashboard/tekliflerim/page.tsx`

```ts
const [offers, setOffers] = useState<OfferItem[]>([]);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

Bu da sayfa seviyesindeki liste state'i.

## Side effect ornegi: `useEffect`

### Dosya: `apps/web/src/app/dashboard/tekliflerim/page.tsx`

```ts
useEffect(() => {
  if (status !== "ready" || !accessToken) {
    if (status === "checking") {
      setIsLoading(true);
    }
    return;
  }

  const loadOffers = async () => {
    const response = await getMyOffers(accessToken);
    setOffers(response);
  };

  void loadOffers();
}, [accessToken, router, status]);
```

Bu `useEffect` ne yapiyor:

- auth hazir mi bakiyor
- sonra API cagrisi yapiyor
- response gelince state'i guncelliyor

## Paylasilan auth state: `localStorage` + `useSyncExternalStore`

Bu projedeki en onemli state management noktasi auth state.

### Dosya: `apps/web/src/lib/auth/auth-storage.ts`

```ts
export function getStoredAuth(): StoredAuth | null {
  const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
  ...
}

export function setStoredAuth(auth: StoredAuth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, rawAuth);
  emitAuthChange();
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
}
```

Bu dosya browser storage'i tek merkezden yonetiyor.

### Dosya: `apps/web/src/lib/auth/use-dashboard-access.ts`

```ts
const auth = useSyncExternalStore(
  subscribeToAuthChanges,
  getStoredAuth,
  getServerAuthSnapshot
);
```

Bu satirin anlami:

- `localStorage` dogrudan React state degil
- bu yuzden React'e "bu dis store degisti" demek gerekiyor
- `useSyncExternalStore` bu isi dogru sekilde yapiyor

Yani bu projede auth icin "global state library" yerine:

- browser storage
- custom subscribe mekanizmasi
- `useSyncExternalStore`

kullaniliyor.

## Navbar da auth state'e abone oluyor

### Dosya: `apps/web/src/components/Navbar.tsx`

```ts
useEffect(() => {
  const syncAuth = () => {
    setAuth(getStoredAuth());
    setIsReady(true);
  };

  syncAuth();

  return subscribeToAuthChanges(syncAuth);
}, []);
```

Bu da auth degisince navbar'in kendini guncelledigini gosteriyor.

## Bu basligin net sonucu

Bu projede state management uc seviyede:

1. component-local state: `useState`
2. side-effect / async akisi: `useEffect`
3. app genelinde auth state paylasimi: `localStorage` + custom event + `useSyncExternalStore`

---

# 6. 30 Dakika Pasiflik Sonrasi Sistemden Atma Nasil Eklenir

## Mevcut durum

Su anki sistem:

- access token: `15m`
- refresh token: `7d`
- kullanici bir request yaptiginda access token biterse refresh calisiyor
- bu yuzden kullanici 7 gun boyunca tekrar login olmadan kalabiliyor

Bu davranis su anki auth config ve `api-client.ts` refresh mekanizmasinin dogal sonucu.

## Istenen yeni kural

Kural:

> Tokenlar dursun ama kullanici 30 dakika boyunca hic islem yapmazsa, butona basmazsa, request atmazsa sistemden ciksin.

Bu, token TTL'den farkli bir kavramdir.

- token TTL: kriptografik gecerlilik suresi
- idle timeout: kullanici aktivitesine gore oturum sonlandirma

## Bunu mevcut sisteme uygulamanin en sade yolu

En az degisiklikle uygulanabilir cozum client-side idle timeout'tur.

### Onerilen dosya degisiklikleri

1. `apps/web/src/lib/auth/auth-storage.ts`
2. yeni bir helper dosyasi, ornegin `apps/web/src/lib/auth/auth-activity.ts`
3. yeni bir client component, ornegin `apps/web/src/components/SessionActivityManager.tsx`
4. `apps/web/src/app/layout.tsx` icinde bu component'i mount etmek
5. `apps/web/src/lib/api/api-client.ts` icinde request oncesi idle kontrolu

## Onerilen mantik

### Adim 1: son aktivite zamanini sakla

`auth-storage.ts` icinde ayri bir key tanimlanabilir:

```ts
const AUTH_ACTIVITY_KEY = "nakliye.auth.last-activity";
```

Ve helper fonksiyonlar:

```ts
export function touchAuthActivity() {
  window.localStorage.setItem(AUTH_ACTIVITY_KEY, String(Date.now()));
}

export function getLastAuthActivity(): number | null {
  const raw = window.localStorage.getItem(AUTH_ACTIVITY_KEY);
  return raw ? Number(raw) : null;
}
```

## Adim 2: login olunca activity baslat

### Dosya: `apps/web/src/app/login/page.tsx`

Mevcut:

```ts
setStoredAuth(response);
router.replace("/");
```

Buraya mantiksal olarak su eklenir:

```ts
setStoredAuth(response);
touchAuthActivity();
router.replace("/");
```

## Adim 3: kullanici etkileşimlerini dinle

Root seviyede bir client component lazim.

### Mevcut root dosya: `apps/web/src/app/layout.tsx`

```tsx
<body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-950">
  <Navbar />
  {children}
</body>
```

Burada `Navbar` zaten client component oldugu icin iki yol var:

- yeni `SessionActivityManager` component'i eklemek
- ya da bu mantigi `Navbar` icine koymak

Ben daha temiz oldugu icin ayri component oneririm.

### Onerilen yeni dosya: `apps/web/src/components/SessionActivityManager.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredAuth,
  getStoredAuth,
} from "@/lib/auth/auth-storage";
import {
  touchAuthActivity,
  getLastAuthActivity,
} from "@/lib/auth/auth-activity";

const IDLE_LIMIT_MS = 30 * 60 * 1000;

export default function SessionActivityManager() {
  const router = useRouter();

  useEffect(() => {
    const markActivity = () => {
      if (!getStoredAuth()) {
        return;
      }

      touchAuthActivity();
    };

    const checkIdle = () => {
      const auth = getStoredAuth();
      const lastActivity = getLastAuthActivity();

      if (!auth || !lastActivity) {
        return;
      }

      if (Date.now() - lastActivity > IDLE_LIMIT_MS) {
        clearStoredAuth();
        router.replace("/login");
      }
    };

    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    const intervalId = window.setInterval(checkIdle, 60_000);
    checkIdle();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
```

## Adim 4: request atmadan once idle mi kontrol et

Bu kisim cok onemli. Sadece event dinlemek bazen yetmez. `api-client.ts` request atmadan once de bakabilir.

### Dosya: `apps/web/src/lib/api/api-client.ts`

Mantiksal ek:

```ts
function assertNotIdle() {
  const lastActivity = getLastAuthActivity();

  if (!lastActivity) {
    return;
  }

  if (Date.now() - lastActivity > 30 * 60 * 1000) {
    clearStoredAuth();
    throw new ApiClientError(401, "Session expired due to inactivity.", "");
  }
}
```

Sonra auth gereken request'ten once:

```ts
if (options.accessToken) {
  assertNotIdle();
}
```

## Adim 5: refresh request aktivite sayilmamali

Bu cok kritik tasarim karari.

Eger `/auth/refresh` cagrisi activity sayilirse:

- kullanici hicbir sey yapmasa bile
- arka planda token yenileme
- oturumu dolayli olarak uzatabilir

Bu ise istenen kuralla celisir.

Bu yuzden:

- `touchAuthActivity()` sadece gercek kullanici etkilesiminde calismali
- otomatik refresh'in kendisi activity sayilmamali

## Pratik minimum cozum

En hizli uygulanabilir versiyon:

1. `auth-storage.ts` icine `lastActivityAt` destegi ekle
2. `Navbar.tsx` ya da yeni `SessionActivityManager.tsx` icinde event listener kur
3. her 1 dakikada bir idle kontrol yap
4. 30 dakikayi astiysa `clearStoredAuth()` + `/login`
5. `api-client.ts` request oncesi de idle kontrol ekle

Bu cozum mevcut mimariye en az carpacak yoldur.

## Daha guclu, server-side garantili cozum

Client-side idle timeout UX icin iyidir ama tek basina guvenlik garantisi degildir. Daha guclu versiyon icin:

1. refresh token'lari veya session kayitlarini DB'de tut
2. session tablosuna `lastActivityAt` alani ekle
3. her auth request veya secilen user-action endpoint'inde bu alan guncellensin
4. refresh endpoint'i `lastActivityAt` 30 dakikadan eskiyse token yenilemeyi reddetsin

Bu modelde backend de "idle session expired" karari verir.

## Bu projeye gore hangisi mantikli

Bu repo icin en pragmatik sira su olur:

1. once client-side idle timeout ekle
2. ihtiyac buyurse refresh token/session persistence katmanina gec

Cunku su an sistemde refresh token stateless JWT gibi kullaniliyor; DB-backed session yok. Bu nedenle server-side idle timeout ikinci asama refactor olur.

---

# Sonuc Ozeti

## 1. Token mekanizmasi

- Backend `15m` access, `7d` refresh token uretiyor
- Web bunlari `localStorage`'da tutuyor
- `api-client.ts` artik `401` durumunda refresh deneyip request'i yeniden atiyor

## 2. Plaka + soft delete

- klasik `@unique` kalkti
- onun yerine `WHERE silmeTarihi IS NULL` partial unique index geldi
- aktif kayitlar sorguda `silmeTarihi: null` ile filtreleniyor
- unique cakisimi backend'de `P2002 -> ConflictException` olarak esleniyor

## 3. DI

- Nest backend'de gercek DI var
- frontend'de daha cok manual dependency passing var
- Java / Spring constructor injection mantigina cok benziyor

## 4. Singleton / transient

- bu projede explicit transient yok
- provider'larin cogu default singleton
- `PrismaService` en net singleton ornegi

## 5. State management

- local state: `useState`
- async / side effect: `useEffect`
- auth paylasimi: `localStorage` + custom event + `useSyncExternalStore`
- `use client`, browser API ve interaktif component boundary'si icin gerekli

## 6. 30 dakika pasiflik

- mevcut sisteme en az carpacak cozum client-side idle timeout
- root seviyede activity listener + timer + `api-client` request oncesi kontrol yeterli
- daha guclu versiyon icin backend session tablosu gerekir

