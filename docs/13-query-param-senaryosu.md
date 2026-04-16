# Query Param Senaryosu

Bu dokuman, `query param` kavramini bu proje uzerinden senaryo mantigiyla anlatir.

Buradaki ana fikir su:

- projede su an gercek bir query param kullanimi yok
- ama cok dogal bir ihtiyac ortaya cikarsa query param kullanmak mantikli olur
- en uygun ornek, kullanici listesini filtrelemek ve sayfalamaktir

## 1. Query Param Nedir?

Query param, URL'nin `?` isaretinden sonra gelen degerlerdir.

Ornek:

```text
/api/v1/users?search=mehmet&role=NAKLIYECI&page=2&limit=10
```

Burada query param'ler sunlardir:

- `search=mehmet`
- `role=NAKLIYECI`
- `page=2`
- `limit=10`

Yani ayni endpoint ayni kalir, ama davranisi ek parametrelerle degisir.

## 2. Bu Projede Neden Mantikli Olurdu?

Su an kullanici listesi endpoint'i:

```text
GET /api/v1/users
```

Bu endpoint su anda tum aktif kullanicilari getiriyor.

Ama ileride su ihtiyaclar gelebilir:

- sadece `NAKLIYECI` rolundekileri goster
- ada veya kullanici adina gore ara
- listeyi sayfalara bol
- bir seferde 10 yerine 20 kayit getir

Bu ihtiyaclar icin yeni yeni endpoint acmak yerine query param kullanmak daha temiz olur.

## 3. Olası Senaryo

Asagidaki endpoint dusunulebilir:

```text
GET /api/v1/users?search=mehmet&role=NAKLIYECI&page=1&limit=10
```

Bu endpoint'in anlami su olur:

- kullanici listesi getir
- icinde `mehmet` gecenleri filtrele
- rolu `NAKLIYECI` olanlari al
- 1. sayfayi getir
- en fazla 10 kayit don

## 4. Hangi Dosyalara Ne Eklenirdi?

Bu senaryoda buyuk ihtimalle su dosyalar degisirdi:

- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/repositories/users.repository.ts`
- `apps/api/src/modules/users/dto/` altina yeni bir query dto
- `apps/web/src/app/hakkimizda/page.tsx`

## 5. Controller Tarafi

Controller'da `@Query()` kullanirdik.

Ornek mantik:

```ts
@Get()
@UseGuards(JwtAuthGuard)
getUsers(@Query() query: ListUsersQueryDto): Promise<UserProfileResponseDto[]> {
  return this.usersService.getFilteredProfiles(query);
}
```

Buradaki mantik:

- endpoint yine `GET /users` kalir
- query param'ler `ListUsersQueryDto` icine toplanir
- controller sadece HTTP girisini alir
- filtreleme mantigini service'e yollar

## 6. DTO Tarafi

Yeni bir query DTO tanimlanabilirdi:

```ts
export class ListUsersQueryDto {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}
```

Burada query param'leri tipli hale getiririz.

Ornek eslesme:

- `?search=mehmet` -> `query.search`
- `?role=NAKLIYECI` -> `query.role`
- `?page=2` -> `query.page`
- `?limit=10` -> `query.limit`

Bu DTO'nun faydasi:

- query param'ler tek tek daginik kalmaz
- validation eklemek kolaylasir
- controller imzasi daha okunur olur

## 7. Service Tarafi

Service burada is kurallarini uygulardi.

Ornek mantik:

```ts
async getFilteredProfiles(query: ListUsersQueryDto): Promise<UserProfileResponseDto[]> {
  const users = await this.usersRepository.findFilteredProfiles(query);
  return users.map((user) => this.mapStoredProfile(user));
}
```

Buradaki isler:

- page ve limit icin varsayilan deger belirlemek
- role filtresi gecerli mi kontrol etmek
- search bos mu dolu mu bakmak
- repository'ye temiz bir filtre objesi gondermek

## 8. Repository Tarafi

Repository Prisma sorgusunu kurardi.

Ornek dusunce:

```ts
async findFilteredProfiles(query: ListUsersQueryDto): Promise<StoredUserProfileRecord[]> {
  return this.prisma.client.kullanici.findMany({
    where: {
      silmeTarihi: null,
      ...(query.search
        ? {
            OR: [
              { ad: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              { soyad: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              { kullaniciAdi: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    },
  });
}
```

Burada query param'in DB etkisi gorulur:

- `search` varsa arama kosulu eklenir
- `role` varsa rol filtresi eklenir
- `page` ve `limit` varsa `skip` ve `take` kullanilir

Yani query param, DB sorgusunun davranisini degistirir.

## 9. Frontend Tarafi

Frontend'de de `URLSearchParams` veya dogrudan string ile query param eklenebilirdi.

Ornek:

```ts
const params = new URLSearchParams({
  search: "mehmet",
  role: "NAKLIYECI",
  page: "1",
  limit: "10",
});

const data = await apiFetch<UserRow[]>(`/users?${params.toString()}`, {
  accessToken,
});
```

Bu durumda `/hakkimizda` sayfasi:

- arama input'u alabilir
- rol secimi yapabilir
- sayfalama tuslari koyabilir

Ve bunlari query param olarak backend'e gonderebilir.

## 10. Query Param Neden Iyi Bir Secim?

Bu senaryoda query param kullanmak faydalidir cunku:

- istek hala `GET` olarak kalir
- okuma islemi oldugu net anlasilir
- filtreleme ve sayfalama URL uzerinden ifade edilir
- ayni endpoint uzerinde esnek davranis saglanir
- link paylasimi kolay olur

Mesela su link anlamli bir linktir:

```text
/users?role=NAKLIYECI&page=2
```

Bu, "nakliyecilerin ikinci sayfasini getir" demektir.

## 11. Ne Zaman Query Param Kullanmak Mantikli Degildir?

Su durumlarda query param iyi secim olmaz:

- cok buyuk veri gonderiliyorsa
- hassas veri tasiniyorsa
- create/update gibi write islemi yapiliyorsa

Mesela su kotu bir tasarim olurdu:

```text
GET /register?password=123456
```

Cunku:

- URL'ye hassas veri yazilir
- semantik bozulur
- `GET` write islemi yapmamalidir

## 12. Bu Proje Icin En Dogal Query Param Ornekleri

Bu repoda ileride en mantikli query param adaylari sunlar olur:

- `GET /users?search=...`
- `GET /users?role=...`
- `GET /users?page=...&limit=...`
- `GET /offers?status=...`
- `GET /transport-requests?city=...`

Yani listeleme ve filtreleme olan yerlerde query param cok dogal olur.

## 13. Sonuc

Bu projede su an gercek query param kullanimi yok. Ama eger `/users` listesi buyurse, query param cok mantikli bir sonraki adim olur.

En basit ornek:

```text
GET /api/v1/users?search=mehmet&role=NAKLIYECI&page=1&limit=10
```

Bu tasarim sayesinde:

- endpoint degismeden filtreleme yapilir
- frontend esnek hale gelir
- service ve repository tarafinda kontrollu bir arama/listeme akisi kurulur

Kisa ozet:

- route ayni kalir
- davranis query param ile zenginlesir
- en cok okuma, filtreleme ve sayfalama senaryolarinda ise yarar
