# Hakkimizda Sayfasinda Kullanici Tablosu Gosterme Anlatimi

Bu dokumanin amaci su soruya cevap vermektir:

`DB'deki kullanicilari /hakkimizda sayfasinda gostermek istersek, bu projede bunu nasil kurariz?`

Bu dokuman ilk yazildiginda senaryo `ADMIN` korumali dusunulmustu. Ancak bu repoda hazir admin hesap olmadigi icin uygulanan gercek cozum su sekilde uyarlanmistir:

- endpoint public degil
- ama `ADMIN` zorunlu da degil
- yani liste sadece giris yapmis normal kullanicilar tarafindan gorulebilir

Bu belge hem hangi dosyalara kod ekledigimizi hem de eklenen kodlarin ne yaptigini anlatir.

## 1. Mevcut Durum

Uygulamadan once repo durumu soyleydi:

- `apps/web/src/app/hakkimizda/page.tsx` sadece `Hazirlaniyor...` yazan bir placeholder sayfaydi
- `users` modulunde henuz `users.controller.ts` yoktu
- backend tarafinda kullanici listeleme endpoint'i bulunmuyordu
- login sonrasi auth verisi web tarafinda `localStorage["nakliye.auth"]` altinda tutuluyordu

Bu tablo bize su teknik sonucu verdi:

Sadece frontend'e bir tablo eklemek yetmez. Once backend tarafinda kullanicilari donduren yeni bir endpoint acmak gerekir.

## 2. Neden Public Degil, Auth Korumali?

Kullanici listesi gibi bir veri ekrana basilacaksa bunun tamamen public olmasi saglikli olmaz.

Bu yuzden uygulanan cozumde:

- endpoint `JwtAuthGuard` ile korundu
- yani token'siz istekler reddedilir
- ama `RolesGuard` eklenmedi

Bunun nedeni urunsel degil, pratik bir durumdur:

- repoda admin hesap hazir degil
- ozellik hemen test edilebilsin istendi
- bu yuzden "giris yapmis herhangi bir kullanici gorebilsin" modeli secildi

Ileride admin hesap veya gercek role bazli panel mantigi geldiginde bu endpoint kolayca `ADMIN` korumali hale cevrilebilir.

## 3. Genel Cozum Plani

Uygulanan cozum su akisi izler:

1. Backend'e `GET /api/v1/users` endpoint'i eklendi.
2. Bu endpoint `JwtAuthGuard` ile korundu.
3. `UsersRepository` aktif kullanicilari DB'den ceker hale getirildi.
4. `UsersService` bu veriyi `UserProfileResponseDto[]` listesine map eder hale getirildi.
5. `UsersModule` yeni `UsersController` ile genisletildi.
6. `/hakkimizda` sayfasi client component yapildi.
7. Sayfa `localStorage`'dan token okur.
8. Token ile `/users` endpoint'ine istek atar.
9. Basarili cevap gelirse tabloyu render eder.
10. Login yoksa veya fetch hatasi varsa uygun mesaj gosterir.

## 4. Backend Tarafinda Hangi Dosyalara Kod Ekledik?

Backend tarafinda degisen yerler:

- `apps/api/src/modules/users/users.controller.ts` eklendi
- `apps/api/src/modules/users/users.service.ts` genisletildi
- `apps/api/src/modules/users/repositories/users.repository.ts` genisletildi
- `apps/api/src/modules/users/users.module.ts` guncellendi

### 4.1 Yeni `users.controller.ts`

Eklenen dosya:

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

- `import { Controller, Get, UseGuards } ...`
  Controller tanimlamak, GET endpoint acmak ve guard uygulamak icin gereken Nest araclarini aliyoruz.

- `import { JwtAuthGuard } ...`
  Bu endpoint sadece giris yapmis kullanicilar tarafindan cagirilabilsin diye auth guard kullaniyoruz.

- `import { UserProfileResponseDto } ...`
  Response'un hangi sekilde donecegini tip seviyesinde acikca belirtiyoruz.

- `import { UsersService } ...`
  Controller veri sorgulamaz; service katmanina delegasyon yapar.

- `@Controller("users")`
  Bu sinifin route tabani `/users` olur.

- `constructor(private readonly usersService: UsersService) {}`
  `UsersService`, Nest'in dependency injection sistemi ile controller'a verilir.

- `@Get()`
  Bu metod `GET /users` endpoint'ine cevap verir.

- `@UseGuards(JwtAuthGuard)`
  Token'i olmayan kullanici bu endpoint'e giremez.

- `getUsers(): Promise<UserProfileResponseDto[]>`
  Bu metodun bir kullanici listesi dondurecegini acikca soyluyoruz.

- `return this.usersService.getAllActiveProfiles();`
  Controller katmani yalnizca istegi alir ve service'e iletir.

### 4.2 `users.service.ts` icine eklenen metod

Eklenen metod:

```ts
async getAllActiveProfiles(): Promise<UserProfileResponseDto[]> {
  const users = await this.usersRepository.findAllActiveProfiles();
  return users.map((user) => this.mapStoredProfile(user));
}
```

Satir satir aciklama:

- `async getAllActiveProfiles(): Promise<UserProfileResponseDto[]> {`
  Yeni service metodu tanimlanir. Geriye kullanici profili listesi donecektir.

- `const users = await this.usersRepository.findAllActiveProfiles();`
  Ham DB sonucunu service'in icinde yazmiyoruz; repository'den aliyoruz.

- `return users.map((user) => this.mapStoredProfile(user));`
  Repository'den gelen profile kayitlarini API tarafinda donulecek DTO bicimine ceviriyoruz.

Bu katmanda neden map yapiyoruz?

- repository DB sekline yakindir
- service API tarafina yakindir

Yani bu donusum service katmaninda olmalidir.

### 4.3 `users.repository.ts` icine eklenen sorgu

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
  Repository seviyesinde yeni listeleme sorgusu tanimlanir.

- `const users = await this.prisma.client.kullanici.findMany({`
  Prisma ile `kullanici` tablosundan birden fazla satir cekiyoruz.

- `where: { silmeTarihi: null }`
  Sadece aktif kullanicilar gelsin istiyoruz. Soft-delete edilmis satirlari listeye almiyoruz.

- `select: userProfileSelect`
  Profil icin gereken alanlari seciyoruz. `sifreHash` burada bilerek yoktur.

- `orderBy: { id: "asc" }`
  Sonucun her seferinde tutarli bir sirada gelmesini sagliyoruz.

- `return users.map((user) => this.mapStoredProfile(user));`
  Prisma sonucunu repository'nin profile kayit tipine ceviriyoruz.

En kritik guvenlik noktasi:

Bu endpoint kullanici tablosu gosterdigi icin `sifreHash` kesinlikle donmemelidir. Bu nedenle `userProfileSelect` kullanmak dogru yaklasimdir.

### 4.4 `users.module.ts` icindeki degisiklik

Yeni hali:

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

- `import { UsersController } ...`
  Yeni controller'i module'e tanitiyoruz.

- `controllers: [UsersController]`
  `users` modulu artik kendi HTTP endpoint'ini expose eder hale gelir.

- `providers: [UsersService, UsersRepository]`
  Service ve repository bu module icinde provider olarak kalir.

- `exports: [UsersService]`
  Diger moduller ihtiyac duyarsa `UsersService` kullanabilsin diye export korunur.

## 5. Frontend Tarafinda Hangi Dosyaya Kod Ekledik?

Frontend tarafinda ana degisiklik:

- `apps/web/src/app/hakkimizda/page.tsx`

Bu sayfayi client component yaptik. Cunku auth bilgisi `localStorage` altinda tutuluyor ve `localStorage` sadece browser tarafinda okunabilir.

Eklenen sayfa:

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

## 6. Frontend Kodunun Satir Satir Aciklamasi

- `"use client";`
  Bu dosyanin browser tarafinda calisacagini soyler. `localStorage` kullandigimiz icin zorunludur.

- `import { useEffect, useState } ...`
  Veri cekme zamani ve sayfa state'lerini yonetmek icin React hook'lari gerekir.

- `import { ApiClientError, apiFetch } ...`
  Mevcut API istemcisini tekrar kullaniyoruz. Bu sayede `Authorization: Bearer ...` ekleme mantigi ayni yerde kalir.

- `const AUTH_STORAGE_KEY = "nakliye.auth";`
  Login sonrasi auth bilgisinin storage anahtari burada tek sabit olarak tanimlanir.

- `type AuthStorage = { accessToken: string; };`
  Storage'dan okuyacagimiz auth verisinin bize gereken minimum kismini tanimliyoruz.

- `type UserRow = { ... }`
  Tabloda gosterecegimiz her satirin veri yapisini acikliyoruz.

- `const [users, setUsers] = useState<UserRow[]>([]);`
  Kullanici listesini tutan state.

- `const [isLoading, setIsLoading] = useState(true);`
  Veri yuklenirken loading gostermek icin state.

- `const [error, setError] = useState<string | null>(null);`
  Auth veya fetch hatasi cikarsa bunu gostermek icin state.

- `useEffect(() => { ... }, []);`
  Sayfa ilk render edildiginde bir kez veri cekmek icin kullanilir.

- `const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);`
  Daha once login olunurken saklanan auth verisini browser storage'dan aliyoruz.

- `if (!rawAuth) { ... }`
  Kullanici login degilse tablo gostermek yerine hata mesaji donuyoruz.

- `auth = JSON.parse(rawAuth) as AuthStorage;`
  Storage'daki string veriyi object'e ceviriyoruz.

- `const data = await apiFetch<UserRow[]>("/users", { accessToken: auth.accessToken });`
  Asil fetch satiri budur. Token'i Bearer olarak gonderip backend'deki `/users` endpoint'ini cagiriyoruz.

- `setUsers(data);`
  Basarili response gelirse tablo state'i doldurulur.

- `if (fetchError instanceof ApiClientError) { ... }`
  Backend'den gelen anlamli hata mesajini ekrana basiyoruz.

- `void run();`
  `useEffect` icinde async fonksiyonu dogrudan yazmak yerine wrapper fonksiyonu tetikliyoruz.

- `if (isLoading) return ...`
  Veri gelmeden once loading mesaji gosteriyoruz.

- `if (error) return ...`
  Login yoksa veya endpoint hata donerse tablo yerine hata mesaji gosteriyoruz.

- `users.map(...)`
  Gelen listeyi tablo satirlarina ceviriyoruz.

- `{user.telefonNumarasi ?? "-"}`
  Telefon bilgisi yoksa bos alan yerine `-` gosteriyoruz.

- `{user.roles.join(", ")}`
  Rol dizisini okunabilir string haline getiriyoruz.

## 7. Uctan Uca Istek Akisi

Bu ozellikte tam akis soyledir:

1. Kullanici login olur.
2. Login response'u `localStorage["nakliye.auth"]` altina yazilir.
3. Kullanici `/hakkimizda` sayfasina gider.
4. Sayfa token'i storage'dan okur.
5. `accessToken` ile `GET /api/v1/users` istegi atilir.
6. Backend'de `JwtAuthGuard` token'i dogrular.
7. Token gecerliyse `UsersService` listeyi ceker.
8. `UsersRepository`, Prisma ile aktif kullanicilari okur.
9. Response `UserProfileResponseDto[]` olarak doner.
10. Frontend bu veriyi tablo olarak render eder.

## 8. Guvenlik ve Mimari Notu

Bu uygulamada kullanici listesi public yapilmadi. Ama admin korumasi da eklenmedi. Bu, urunsel olarak nihai karar degil; repoda admin hesap olmamasi nedeniyle secilen pratik bir uygulama karari.

Yani bugunku durum:

- auth zorunlu
- rol zorunlu degil

Ileride gerekirse ayni endpoint su hale cevrilebilir:

- `JwtAuthGuard + RolesGuard`
- `@Roles(ROLE_NAMES.ADMIN)`

Bir baska kritik nokta:

Response'ta `sifreHash` kesinlikle yoktur. Listeleme endpoint'i auth sirri tasimak icin degil, profil gostermek icin vardir.

## 9. Son Hukum

Bu projede `/hakkimizda` sayfasinda DB'deki kullanicilari gostermek icin uc katmanli bir akis kurduk:

- backend'de yeni liste endpoint'i
- service/repository ile veri toplama ve map etme
- frontend'de token ile fetch edip tablo olarak render etme

Bu uygulama sunu gosterir:

Bir sayfada veri gostermek sadece UI meselesi degildir. Auth, endpoint tasarimi, DTO secimi, service/repository ayrimi ve frontend fetch akisinin birlikte dusunulmesi gerekir.
