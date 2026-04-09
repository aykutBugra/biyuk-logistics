# Hakkimizda Kullanici Tablosu: Gercek Uygulama Detayi

Bu dokuman, `11-hakkimizda-kullanici-tablosu-anlatimi.md` dosyasindaki teorik anlatisin gercekte nasil uygulandigini anlatir.

Buradaki amac:

- hangi dosyalari gercekte degistirdigimizi gostermek
- eklenen veya guncellenen kodlari tek tek aciklamak
- neden o satirlari ekledigimizi netlestirmek

Bu belge teorik degil, gercek uygulama uzerindendir.

## 1. Bu Ozellikte Hangi Dosyalari Degistirdik?

Bu ozellik icin su dosyalar degisti:

- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.module.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/repositories/users.repository.ts`
- `apps/api/src/modules/roles/roles.service.ts`
- `apps/web/src/app/hakkimizda/page.tsx`

Buradaki mantik:

- backend tarafinda yeni bir liste endpoint'i ekledik
- users modulu bunu destekleyecek hale geldi
- eski bootstrap rol verileri yuzunden patlayan role normalization kismini geriye uyumlu hale getirdik
- frontend tarafinda `/hakkimizda` sayfasini gercek veri cekecek hale getirdik

## 2. `users.controller.ts`

Dosya:

```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UserProfileResponseDto } from "./dto/user-profile-response.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getUsers(): Promise<UserProfileResponseDto[]> {
    return this.usersService.getAllActiveProfiles();
  }
}
```

Satir satir aciklama:

- `import { Controller, Get, UseGuards } from "@nestjs/common";`
  Nest'in controller tanimlamak, GET route acmak ve guard uygulamak icin gereken dekoratorlerini aliyoruz.

- `import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";`
  Bu endpoint'i sadece giris yapmis kullanicilar gorebilsin diye JWT auth guard import ediyoruz.

- `import { UserProfileResponseDto } from "./dto/user-profile-response.dto";`
  Endpoint'in response tipini acikca belirtmek icin profil DTO'sunu kullaniyoruz.

- `import { UsersService } from "./users.service";`
  Controller, DB'ye dogrudan gitmesin; service katmani uzerinden calissin diye service import ediyoruz.

- `@Controller("users")`
  Bu sinifin route tabanini `/users` yapar. Uygulama global prefix'i `api/v1` oldugu icin tam yol `GET /api/v1/users` olur.

- `export class UsersController {`
  `users` feature'inin HTTP giris sinifi baslar.

- `constructor(private readonly usersService: UsersService) {}`
  Nest dependency injection ile `UsersService`'i bu controller'a enjekte eder.

- `@Get()`
  Bu metodun `GET` request'i dinleyecegini soyler.

- `@UseGuards(JwtAuthGuard)`
  Token'i olmayan kullanici bu endpoint'e giremez. Once auth kontrolu yapilir.

- `getUsers(): Promise<UserProfileResponseDto[]> {`
  Bu metodun bir dizi kullanici profili donecegini tip seviyesinde netlestiriyoruz.

- `return this.usersService.getAllActiveProfiles();`
  Controller mantik yazmaz; service'e delegasyon yapar.

Bu dosyanin amaci:

- HTTP istegini almak
- auth korumasini uygulamak
- service katmanini cagirmak

## 3. `users.module.ts`

Dosya:

```ts
import { Module } from "@nestjs/common";
import { RolesModule } from "../roles/roles.module";
import { UsersController } from "./users.controller";
import { UsersRepository } from "./repositories/users.repository";
import { UsersService } from "./users.service";

@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

Satir satir aciklama:

- `import { Module } from "@nestjs/common";`
  Nest module tanimlamak icin gereken dekoratoru aliyoruz.

- `import { RolesModule } from "../roles/roles.module";`
  `UsersService` icinde `RolesService` kullanildigi icin `RolesModule` bagimliligini koruyoruz.

- `import { UsersController } from "./users.controller";`
  Az once ekledigimiz yeni controller'i module'e tanitiyoruz.

- `import { UsersRepository } ...`
  Repository veri erisimi icin bu module icinde provider olarak bulunur.

- `import { UsersService } ...`
  Users servis mantigi bu module'un provider'idir.

- `@Module({ ... })`
  Bu sinifin Nest module oldugunu soyler.

- `imports: [RolesModule],`
  Bu module, `RolesModule`'den gelen servisleri kullanabilir.

- `controllers: [UsersController],`
  `users` endpoint'leri artik bu module altinda expose edilir.

- `providers: [UsersService, UsersRepository],`
  Service ve repository bu module icinde instantiate edilir.

- `exports: [UsersService],`
  Diger moduller gerekirse `UsersService`'i import eden module uzerinden kullanabilir.

- `export class UsersModule {}`
  Module sinifi tanimlanir.

Bu dosyanin amaci:

- `users` feature'inin sinirini Nest icinde tanimlamak
- yeni controller'i aktif etmek
- gerekli provider'lari bir arada tutmak

## 4. `users.service.ts`

Bu dosyanin tamami zaten vardi. Biz bu dosyaya yeni bir listeleme metodu ekledik.

Eklenen metod:

```ts
async getAllActiveProfiles(): Promise<UserProfileResponseDto[]> {
  const users = await this.usersRepository.findAllActiveProfiles();
  return users.map((user) => this.mapStoredProfile(user));
}
```

Satir satir aciklama:

- `async getAllActiveProfiles(): Promise<UserProfileResponseDto[]> {`
  Yeni service metodu baslar. Geriye bir kullanici profili listesi donecektir.

- `const users = await this.usersRepository.findAllActiveProfiles();`
  Ham DB verisini service'in icinde sorgulamiyoruz. Repository'den aliyoruz.

- `return users.map((user) => this.mapStoredProfile(user));`
  Repository'nin dondugu profile kayitlarini API tarafinda kullanacagimiz `UserProfileResponseDto` seklinde map ediyoruz.

- `}`
  Metot biter.

Bu metod neden gerekliydi?

- controller'in kullanicilari listeleyebilmesi icin service seviyesinde yeni bir giris noktasina ihtiyac vardi
- service katmani repository'den gelen veriyi API'ye uygun sekle cevirmeliydi

Bu dosyanin ilgili mevcut satirlariyla birlikte mantigi:

- `findProfileById(...)` tek bir kullaniciyi profil olarak getiriyordu
- `getAllActiveProfiles(...)` ise bunun coklu liste halini ekledi

Yani:

- tekli profil = `findProfileById`
- liste profil = `getAllActiveProfiles`

## 5. `users.repository.ts`

Bu dosyanin tamami zaten mevcuttu. Biz buna yeni bir sorgu ekledik.

Eklenen metod:

```ts
async findAllActiveProfiles(): Promise<StoredUserProfileRecord[]> {
  const users = await this.prisma.client.kullanici.findMany({
    where: {
      silmeTarihi: null,
    },
    select: userProfileSelect,
    orderBy: {
      id: "asc",
    },
  });

  return users.map((user) => this.mapStoredProfile(user));
}
```

Satir satir aciklama:

- `async findAllActiveProfiles(): Promise<StoredUserProfileRecord[]> {`
  Repository seviyesinde yeni listeleme metodu basliyor.

- `const users = await this.prisma.client.kullanici.findMany({`
  Prisma ile `kullanici` tablosundan birden fazla kayit cekiyoruz.

- `where: { silmeTarihi: null },`
  Soft-delete edilmis kullanicilar listeye girmesin diye sadece aktif kullanicilari aliyoruz.

- `select: userProfileSelect,`
  `sifreHash` gibi hassas alanlar degil, sadece profil icin gereken alanlari seciyoruz.

- `orderBy: { id: "asc" },`
  Sonuc her seferinde ayni sirada gelsin diye id'ye gore siraliyoruz.

- `});`
  Prisma sorgusu kapanir.

- `return users.map((user) => this.mapStoredProfile(user));`
  Prisma'nin dondugu sonucu repository'nin profile tipi haline ceviriyoruz.

- `}`
  Metot tamamlanir.

Bu metod neden repository'de?

- cunku DB sorgusu repository katmaninin sorumlulugudur
- controller veya service icine Prisma koymuyoruz

### `userProfileSelect` neden onemli?

Bu dosyada yeni metod yazarken kritik bir guvenlik karari verdik:

- `authUserSelect` kullanmadik
- `userProfileSelect` kullandik

Sebebi:

- `authUserSelect` icinde `sifreHash` var
- `/users` endpoint'i tablo gostermek icin var
- bu yuzden response'ta `sifreHash` olmamali

Yani bu secim guvenlik icin dogrudur.

## 6. `roles.service.ts`

Bu dosya ilk basta bu ozellige dogrudan ait gibi durmayabilir. Ama gercekte kritik duzeltme burada yapildi.

Sebep:

- `/users` listesi gelirken her kullanicinin `roles` alani `normalizeRoleNames()` ile normalize ediliyor
- DB'de eski bootstrap verilerinde `kullanici` diye rol vardi
- bizim yeni sabitlerimiz `MUSTERI`, `NAKLIYECI`, `ADMIN`
- bu uyumsuzluk yuzunden sayfa `Unsupported role configuration.` hatasi veriyordu

Guncel dosya:

```ts
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  ROLE_NAMES,
  ROLE_VALUES,
  type RoleName,
} from "../../common/constants/role-names";
import { RoleResponseDto } from "./dto/role-response.dto";
import { RolesRepository } from "./repositories/roles.repository";

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async getRolesForUser(userId: number): Promise<RoleResponseDto> {
    const roleNames = await this.rolesRepository.findRoleNamesByUserId(userId);

    return {
      roles: this.normalizeRoleNames(roleNames),
    };
  }

  async requireRoleId(roleName: RoleName): Promise<number> {
    const role = await this.rolesRepository.findByRoleName(roleName);

    if (!role) {
      throw new InternalServerErrorException(
        `Registration role is not configured: ${roleName}.`
      );
    }

    return role.id;
  }

  normalizeRoleNames(roleNames: string[]): RoleName[] {
    const normalized = roleNames.map((roleName) => {
      const normalizedRoleName = roleName.trim().toUpperCase();

      // Support legacy bootstrap data that used "kullanici" before MUSTERI.
      if (normalizedRoleName === "KULLANICI") {
        return ROLE_NAMES.MUSTERI;
      }

      return normalizedRoleName;
    });
    const invalidRoleNames = normalized.filter(
      (roleName): roleName is string => !ROLE_VALUES.includes(roleName as RoleName)
    );

    if (invalidRoleNames.length > 0) {
      throw new InternalServerErrorException("Unsupported role configuration.");
    }

    return [...new Set(normalized)] as RoleName[];
  }
}
```

Satir satir aciklama:

- `import { ROLE_NAMES, ROLE_VALUES, type RoleName } ...`
  Burada hem tum gecerli rol listesini hem de eski rol adini yeni role map etmek icin `ROLE_NAMES` kullaniyoruz.

- `normalizeRoleNames(roleNames: string[]): RoleName[] {`
  Bu metod DB'den gelen rol adlarini uygulamanin kabul ettigi role cevirir.

- `const normalized = roleNames.map((roleName) => {`
  Her rol adini tek tek islemeye basliyoruz.

- `const normalizedRoleName = roleName.trim().toUpperCase();`
  DB'den gelen degeri once normalize ediyoruz.

- `if (normalizedRoleName === "KULLANICI") {`
  Eski bootstrap datasindaki legacy rol adini yakaliyoruz.

- `return ROLE_NAMES.MUSTERI;`
  `KULLANICI` rolunu gecici geriye uyumluluk icin `MUSTERI` gibi yorumluyoruz.

- `return normalizedRoleName;`
  Diger roller aynen devam eder.

- `const invalidRoleNames = normalized.filter(...)`
  Hala taninmayan rol var mi diye kontrol ediyoruz.

- `if (invalidRoleNames.length > 0) { throw ... }`
  Beklenmeyen bir rol varsa sistemi sessizce bozmak yerine acik hata veriyoruz.

- `return [...new Set(normalized)] as RoleName[];`
  Tekrarlari temizleyip rolu uygulamanin tip sistemine uygun sekilde donduruyoruz.

Bu degisiklik neden gerekliydi?

- aksi halde `/users` endpoint'i eski bootstrap kullanicilar yuzunden 500 veriyordu
- yani liste hic gelmiyordu

## 7. `apps/web/src/app/hakkimizda/page.tsx`

Bu dosya placeholder durumundaydi. Gercek UI uygulamasi burada yapildi.

Guncel dosya:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";

const AUTH_STORAGE_KEY = "nakliye.auth";

type AuthStorage = {
  accessToken: string;
};

type UserRow = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  roles: string[];
};

export default function Page() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);

      if (!rawAuth) {
        setError("Bu sayfayi gormek icin once giris yapmaniz gerekir.");
        setIsLoading(false);
        return;
      }

      let auth: AuthStorage;

      try {
        auth = JSON.parse(rawAuth) as AuthStorage;
      } catch {
        setError("Kayitli oturum verisi okunamadi.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch<UserRow[]>("/users", {
          accessToken: auth.accessToken,
        });

        setUsers(data);
      } catch (fetchError) {
        if (fetchError instanceof ApiClientError) {
          setError(fetchError.message);
        } else {
          setError("Kullanicilar yuklenirken beklenmeyen bir hata olustu.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  if (isLoading) {
    return <div className="p-6">Kullanicilar yukleniyor...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Kullanici Listesi</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">ID</th>
              <th className="border border-gray-300 p-2 text-left">Ad</th>
              <th className="border border-gray-300 p-2 text-left">Soyad</th>
              <th className="border border-gray-300 p-2 text-left">Mail</th>
              <th className="border border-gray-300 p-2 text-left">Kullanici Adi</th>
              <th className="border border-gray-300 p-2 text-left">Telefon</th>
              <th className="border border-gray-300 p-2 text-left">Roller</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="border border-gray-300 p-2">{user.id}</td>
                <td className="border border-gray-300 p-2">{user.ad}</td>
                <td className="border border-gray-300 p-2">{user.soyad}</td>
                <td className="border border-gray-300 p-2">{user.mail}</td>
                <td className="border border-gray-300 p-2">{user.kullaniciAdi}</td>
                <td className="border border-gray-300 p-2">
                  {user.telefonNumarasi ?? "-"}
                </td>
                <td className="border border-gray-300 p-2">
                  {user.roles.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Satir satir aciklama:

- `"use client";`
  Bu sayfa `localStorage` ve React hook kullandigi icin client component olmalidir.

- `import { useEffect, useState } from "react";`
  Veri cekme ve UI state yonetimi icin gereken hook'lari aliyoruz.

- `import { ApiClientError, apiFetch } ...`
  Mevcut API istemcisini kullanarak token ile fetch atiyoruz.

- `const AUTH_STORAGE_KEY = "nakliye.auth";`
  Login sonrasi auth verisinin tutuldugu storage anahtari.

- `type AuthStorage = { accessToken: string; };`
  `localStorage`'dan okuyacagimiz objenin bize gerekli kismi.

- `type UserRow = { ... }`
  Tablodaki her satirin veri tipi.

- `const [users, setUsers] = useState<UserRow[]>([]);`
  Kullanici listesini tutan state.

- `const [isLoading, setIsLoading] = useState(true);`
  Ilk yukleme durumunu takip eden state.

- `const [error, setError] = useState<string | null>(null);`
  Auth veya fetch hatasini gosterecek state.

- `useEffect(() => { ... }, []);`
  Sayfa ilk acildiginda bir kez veri cekmek icin kullanilir.

- `const run = async () => { ... }`
  `useEffect` icinde async fonksiyon tanimliyoruz.

- `const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);`
  Browser storage'dan login sonrasi kaydedilen auth bilgisini okuyoruz.

- `if (!rawAuth) { ... }`
  Login yoksa hata gosterip akisi sonlandiriyoruz.

- `let auth: AuthStorage;`
  Parse edilmis auth datasini tutacak degisken.

- `auth = JSON.parse(rawAuth) as AuthStorage;`
  Storage string'ini object'e ceviriyoruz.

- `catch { setError("Kayitli oturum verisi okunamadi."); ... }`
  Storage bozuksa kullaniciya anlamli hata gosteriyoruz.

- `const data = await apiFetch<UserRow[]>("/users", { accessToken: auth.accessToken, });`
  Asil is burada oluyor. Token'i Bearer header olarak gonderip backend'den listeyi istiyoruz.

- `setUsers(data);`
  Basarili liste gelirse state'e yaziyoruz.

- `if (fetchError instanceof ApiClientError) { setError(fetchError.message); }`
  Backend'in dondugu auth veya server hata mesajini aynen ekrana basiyoruz.

- `finally { setIsLoading(false); }`
  Hangi durum olursa olsun loading'i kapatiyoruz.

- `void run();`
  Async wrapper fonksiyonunu effect icinden tetikliyoruz.

- `if (isLoading) { return ... }`
  Veri gelmeden loading mesaji gosteriyoruz.

- `if (error) { return ... }`
  Auth veya fetch problemi varsa tablo yerine hata gosteriyoruz.

- `<table ...>`
  Basarili durumda kullanici listesini tablo olarak render ediyoruz.

- `{users.map((user) => ( ... ))}`
  Gelen her kaydi bir tablo satiri olarak basiyoruz.

- `{user.telefonNumarasi ?? "-"}`
  Telefon yoksa `-` gosteriyoruz.

- `{user.roles.join(", ")}`
  Rol dizisini okunur string'e ceviriyoruz.

## 8. Uctan Uca Calisma Akisi

Bu ozellik su sekilde calisir:

1. Kullanici login olur.
2. Login response'u `localStorage["nakliye.auth"]` altina yazilir.
3. Kullanici `/hakkimizda` sayfasina gider.
4. Sayfa token'i storage'dan okur.
5. `GET /api/v1/users` istegi Bearer token ile atilir.
6. Backend'de `JwtAuthGuard` token'i dogrular.
7. `UsersController`, `UsersService.getAllActiveProfiles()` metodunu cagirir.
8. `UsersService`, repository'den aktif kullanicilari ister.
9. `UsersRepository`, Prisma ile verileri `userProfileSelect` kullanarak ceker.
10. `RolesService.normalizeRoleNames()` rol adlarini normalize eder.
11. Eski `kullanici` rol verisi varsa `MUSTERI` gibi yorumlanir.
12. Response `UserProfileResponseDto[]` olarak dondurulur.
13. Frontend bu listeyi tablo halinde gosterir.

## 9. Neden Liste Ilk Seferde Gelmedi?

Bu ozellik ilk uygulandiginda `/hakkimizda` sayfasi hata veriyordu:

`Unsupported role configuration.`

Sebep suydi:

- yeni kod `MUSTERI`, `NAKLIYECI`, `ADMIN` bekliyordu
- DB'de eski bootstrap veriler `kullanici` ve `nakliyeci` rol adlariyla duruyordu
- `normalizeRoleNames()` bunlari tanimadigi icin tum liste endpoint'i patliyordu

Bu yuzden `roles.service.ts` icine gecici bir geriye uyumluluk katmani eklendi:

- `KULLANICI` -> `MUSTERI`

Bu duzeltme sayesinde var olan eski verilerle sayfa calisir hale geldi.

## 10. Son Hukum

Bu ozellikte gercekte yaptigimiz sey yalnizca bir tablo cizmek degildi.

Aslinda su katmanli akisi kurduk:

- backend endpoint ekleme
- users module wiring guncellemesi
- service/repository listeleme mantigi
- role normalization uyumlulugu
- frontend token ile fetch
- UI loading/error/table render akisi

Bu dosyayi inceleyerek tek tek su iliskiyi gorebilirsiniz:

- controller ne yapiyor
- module neyi aktif ediyor
- service neyi map ediyor
- repository neden `select` kullaniyor
- role service neden listeyi etkiliyor
- frontend neden client component olmak zorunda
