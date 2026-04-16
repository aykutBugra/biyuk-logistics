# Vehicles Update + Delete Kod Snapshot'i

Bu dosyanin amaci, repo icinde su an var olan `update` ve `delete` ozelligiyle ilgili kod bloklarini tek yerde toplamak.

Bu bir ogrenme dosyasidir.
- Buradaki bloklar mevcut koddaki haliyle alinmistir.
- Bu dosya kodu degistirmez.
- Sen bu dosyaya bakip mevcut kodu elle silebilir ve sonra sifirdan tekrar yazabilirsin.

## Notlar

- `schema.prisma` tarafinda update/delete icin yeni kolon eklenmemistir.
- Soft delete yoktur.
- `PUT` akisi vardir, `PATCH` kullanilmamistir.
- Mevcut kodda `update-vehicle.dto.ts` dosyasi olusmus olsa da, controller ve service tarafinda `PUT` body tipi su an hala `CreateVehicleDto` olarak baglanmistir. Bu dosya snapshot oldugu icin mevcut hali oldugu gibi yazilmistir.

---

## 1. Backend - Controller

**Dosya:** `apps/api/src/modules/vehicles/vehicles.controller.ts`

### 1.1. Import'a eklenenler

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Delete,
  Put,
} from "@nestjs/common";
```

### 1.2. Delete endpoint'i

```ts
@Delete(":id")
@HttpCode(HttpStatus.NO_CONTENT)
deleteMineById(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param("id", ParseIntPipe) id: number
): Promise<void> {
  return this.vehiclesService.deleteMineById(currentUser, id);
}
```

### 1.3. Update endpoint'i

```ts
@Put(":id")
updateMineById(
  @CurrentUser() currentUser: AuthenticatedUser,
  @Param("id", ParseIntPipe) id: number,
  @Body() updateVehicleDto: CreateVehicleDto
): Promise<VehicleDetailResponseDto> {
  return this.vehiclesService.updateMineById(currentUser, id, updateVehicleDto);
}
```

---

## 2. Backend - Service

**Dosya:** `apps/api/src/modules/vehicles/vehicles.service.ts`

### 2.1. Update DTO import'u

```ts
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
```

### 2.2. Delete service metodu

```ts
async deleteMineById(
  currentUser: AuthenticatedUser,
  id: number
): Promise<void> {
  this.assertCarrierRole(currentUser);

  const vehicle = await this.vehiclesRepository.findByIdAndOwnerId(id, currentUser.id);

  if (!vehicle) {
    throw new NotFoundException("Vehicle not found.");
  }

  await this.vehiclesRepository.deleteByIdAndOwnerId(id, currentUser.id);
}
```

### 2.3. Update service metodu

```ts
async updateMineById(
  currentUser: AuthenticatedUser,
  id: number,
  updateVehicleDto: CreateVehicleDto
): Promise<VehicleDetailResponseDto> {
  this.assertCarrierRole(currentUser);

  const marka = normalizeCanonicalText(updateVehicleDto.marka);
  const model = normalizeCanonicalText(updateVehicleDto.model);
  const plaka = normalizeVehiclePlate(updateVehicleDto.plaka);
  const aracKutuphaneId = await this.resolveVehicleLibraryId(marka, model);

  try {
    const updatedVehicle = await this.vehiclesRepository.updateByIdAndOwnerId(
      id,
      currentUser.id,
      {
        aracKutuphaneId,
        plaka,
        yil: updateVehicleDto.yil,
        kapasite: updateVehicleDto.kapasite,
      }
    );

    return this.toDetailResponse(updatedVehicle);
  } catch (error) {
    this.rethrowUniquePlateAsConflict(error);
    throw error;
  }
}
```

### 2.4. Update/delete akisinin dayandigi mevcut helper'lar

Bu helper'lar update ve delete yazarken tekrar kullanildi:

```ts
private async resolveVehicleLibraryId(
  marka: string,
  model: string
): Promise<number> {
  const existingVehicleLibraryId =
    await this.vehiclesRepository.findVehicleLibraryByBrandAndModel(marka, model);

  if (existingVehicleLibraryId !== null) {
    return existingVehicleLibraryId;
  }

  return this.vehiclesRepository.createVehicleLibrary({ marka, model });
}
```

```ts
private assertCarrierRole(currentUser: AuthenticatedUser) {
  if (currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)) {
    return;
  }

  throw new ForbiddenException("Only carriers can manage vehicles.");
}
```

```ts
private rethrowUniquePlateAsConflict(error: unknown): never | void {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return;
  }

  const targets = Array.isArray(error.meta?.target)
    ? error.meta.target.map((target) => String(target))
    : [];

  if (targets.includes("plaka")) {
    throw new ConflictException("Vehicle plate is already in use.");
  }

  throw new ConflictException("Vehicle identifiers must be unique.");
}
```

---

## 3. Backend - Repository

**Dosya:** `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`

### 3.1. Update input type'i

```ts
export type UpdateVehicleRecordInput = {
  aracKutuphaneId: number;
  plaka: string;
  yil: number;
  kapasite: number;
};
```

### 3.2. Delete repository metodu

```ts
async deleteByIdAndOwnerId(id: number, sahipId: number): Promise<void> {
  await this.prisma.client.arac.deleteMany({
    where: {
      id,
      sahipId,
    },
  });
}
```

### 3.3. Update repository metodu

```ts
async updateByIdAndOwnerId(
  id: number,
  sahipId: number,
  input: UpdateVehicleRecordInput
): Promise<StoredVehicleRecord> {
  const updatedVehicles = await this.prisma.client.arac.updateMany({
    where: {
      id,
      sahipId,
    },
    data: {
      aracKutuphaneId: input.aracKutuphaneId,
      plaka: input.plaka,
      yil: input.yil,
      kapasite: new Prisma.Decimal(input.kapasite),
    },
  });

  if (updatedVehicles.count === 0) {
    throw new Error("Vehicle not found or not owned by the user.");
  }

  const updatedVehicle = await this.prisma.client.arac.findFirst({
    where: {
      id,
      sahipId,
    },
    select: vehicleSelect,
  });

  if (!updatedVehicle) {
    throw new Error("Vehicle not found after update.");
  }

  return this.mapStoredVehicle(updatedVehicle);
}
```

### 3.4. Update/delete'in dayandigi mevcut owner query'si

```ts
async findByIdAndOwnerId(
  id: number,
  sahipId: number
): Promise<StoredVehicleRecord | null> {
  const vehicle = await this.prisma.client.arac.findFirst({
    where: {
      id,
      sahipId,
    },
    select: vehicleSelect,
  });

  return vehicle ? this.mapStoredVehicle(vehicle) : null;
}
```

---

## 4. Backend - Update DTO

**Dosya:** `apps/api/src/modules/vehicles/dto/update-vehicle.dto.ts`

```ts
import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const trimAndCollapseWhitespace = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/\s+/g, " ");
};

const toNumber = ({ value }: { value: unknown }) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return value;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? value : parsed;
};

const MAX_VEHICLE_YEAR = new Date().getFullYear() + 1;

export class UpdateVehicleDto {
  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marka!: string;

  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plaka!: string;

  @Transform(toNumber)
  @IsInt()
  @Min(1900)
  @Max(MAX_VEHICLE_YEAR)
  yil!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  kapasite!: number;
}
```

---

## 5. Frontend - Ortak API client

**Dosya:** `apps/web/src/lib/api/api-client.ts`

Delete endpoint'i `204 No Content` dondugu icin eklenen kontrol:

```ts
if (response.status === 204) {
  return undefined as unknown as T;
}
```

---

## 6. Frontend - Vehicles API helper

**Dosya:** `apps/web/src/lib/api/vehicles.ts`

### 6.1. Update helper

```ts
export function updateVehicle(
  id: number,
  input: CreateVehicleInput,
  accessToken: string
) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}
```

### 6.2. Delete helper

```ts
export function deleteVehicle(id: number, accessToken: string) {
  return apiFetch(`/vehicles/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
```

---

## 7. Frontend - Detail sayfasina eklenen delete + duzenle baglantisi

**Dosya:** `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

### 7.1. Import'a eklenenler

```ts
import {
  deleteVehicle,
  getVehicleDetail,
  type VehicleDetail,
} from "@/lib/api/vehicles";
import Link from "next/link";
```

### 7.2. Delete state'i

```ts
const [isDeleting, setIsDeleting] = useState(false);
```

### 7.3. Delete handler

```ts
const handleDelete = async () => {
  if (!accessToken || !vehicle || isDeleting) {
    return;
  }

  const isConfirmed = window.confirm(
    "Bu araci silmek istedigine emin misin?"
  );

  if (!isConfirmed) {
    return;
  }

  try {
    setIsDeleting(true);

    await deleteVehicle(vehicle.id, accessToken);
    router.replace("/dashboard/araclarim");
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      clearStoredAuth();
      window.alert("Oturum gecersiz. Lutfen yeniden giris yapin.");
      router.replace("/login");
      return;
    }

    if (error instanceof ApiClientError && error.status === 403) {
      window.alert("Bu islem icin yetkin yok.");
      router.replace("/");
      return;
    }

    if (error instanceof ApiClientError && error.status === 404) {
      window.alert("Bu arac bulunamadi.");
      router.replace("/dashboard/araclarim");
      return;
    }

    if (error instanceof ApiClientError) {
      window.alert(error.message);
      return;
    }

    window.alert("Arac silinirken beklenmeyen bir hata olustu.");
  } finally {
    setIsDeleting(false);
  }
};
```

### 7.4. Detail kartina eklenen duzenle + sil aksiyonlari

```tsx
<div className="flex flex-col items-start gap-3 md:items-end">
  <div className="text-sm text-gray-500">{vehicle.yil} model</div>
  <div className="flex flex-wrap gap-2">
    <Link
      href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
      className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
    >
      Araci Duzenle
    </Link>

    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? "Siliniyor..." : "Araci Sil"}
    </button>
  </div>
</div>
```

---

## 8. Frontend - Update sayfasi

**Dosya:** `apps/web/src/app/dashboard/araclarim/[id]/duzenle/page.tsx`

Bu dosya update ozelliginin yeni ekranidir.

### 8.1. Import'lar

```ts
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import InputField from "@/components/InputField";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getVehicleDetail,
  updateVehicle,
  type CreateVehicleInput,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
```

### 8.2. Form tipi ve initial state

```ts
type UpdateVehicleForm = {
  marka: string;
  model: string;
  plaka: string;
  yil: string;
  kapasite: string;
};

const initialForm: UpdateVehicleForm = {
  marka: "",
  model: "",
  plaka: "",
  yil: "",
  kapasite: "",
};
```

### 8.3. Form state'leri

```ts
const [form, setForm] = useState<UpdateVehicleForm>(initialForm);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [isSubmitting, setIsSubmitting] = useState(false);
```

### 8.4. Mevcut araci yukleyip forma basan effect

```ts
useEffect(() => {
  if (status !== "ready" || !accessToken) {
    if (status === "checking") {
      setIsLoading(true);
    }
    return;
  }

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    setErrorMessage("Gecersiz arac numarasi.");
    setIsLoading(false);
    return;
  }

  let isMounted = true;

  const loadVehicle = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await getVehicleDetail(vehicleId, accessToken);

      if (!isMounted) {
        return;
      }

      setForm({
        marka: response.marka,
        model: response.model,
        plaka: response.plaka,
        yil: String(response.yil),
        kapasite: String(response.kapasite),
      });
    } catch (error) {
      if (!isMounted) {
        return;
      }

      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        setErrorMessage("Bu arac bulunamadi.");
        return;
      }

      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Arac bilgileri yuklenirken beklenmeyen bir hata olustu."
      );
    } finally {
      if (!isMounted) {
        return;
      }

      setIsLoading(false);
    }
  };

  void loadVehicle();

  return () => {
    isMounted = false;
  };
}, [accessToken, router, status, vehicleId]);
```

### 8.5. Input degisim handler'i

```ts
const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
  const { name, value } = event.target;

  setForm((currentForm) => ({
    ...currentForm,
    [name]: value,
  }));
};
```

### 8.6. Submit handler'i

```ts
const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (isSubmitting || !accessToken || !Number.isInteger(vehicleId) || vehicleId <= 0) {
    return;
  }

  setIsSubmitting(true);

  const payload: CreateVehicleInput = {
    marka: form.marka,
    model: form.model,
    plaka: form.plaka,
    yil: Number(form.yil),
    kapasite: Number(form.kapasite),
  };

  try {
    const response = await updateVehicle(vehicleId, payload, accessToken);
    router.replace(`/dashboard/araclarim/${response.id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      clearStoredAuth();
      window.alert("Oturum gecersiz. Lutfen yeniden giris yapin.");
      router.replace("/login");
      return;
    }

    if (error instanceof ApiClientError && error.status === 403) {
      window.alert("Bu islem icin yetkin yok.");
      router.replace("/");
      return;
    }

    if (error instanceof ApiClientError && error.status === 404) {
      window.alert("Bu arac bulunamadi.");
      router.replace("/dashboard/araclarim");
      return;
    }

    if (error instanceof ApiClientError) {
      window.alert(error.message);
    } else {
      window.alert("Arac guncellenirken beklenmeyen bir hata olustu.");
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

### 8.7. Form'un kendisi

```tsx
{!isLoading && !errorMessage ? (
  <form
    onSubmit={handleSubmit}
    className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <InputField
        name="marka"
        label="Marka"
        placeholder="Orn: Ford"
        value={form.marka}
        onChange={handleChange}
        disabled={isSubmitting}
      />
      <InputField
        name="model"
        label="Model"
        placeholder="Orn: Transit"
        value={form.model}
        onChange={handleChange}
        disabled={isSubmitting}
      />
      <InputField
        name="plaka"
        label="Plaka"
        placeholder="Orn: 34 ABC 123"
        value={form.plaka}
        onChange={handleChange}
        disabled={isSubmitting}
      />
      <InputField
        name="yil"
        label="Yil"
        type="number"
        min="1900"
        max={`${new Date().getFullYear() + 1}`}
        placeholder="Orn: 2020"
        value={form.yil}
        onChange={handleChange}
        disabled={isSubmitting}
      />
      <InputField
        name="kapasite"
        label="Kapasite (ton)"
        type="number"
        min="0.01"
        max="1000"
        step="0.01"
        placeholder="Orn: 20"
        value={form.kapasite}
        onChange={handleChange}
        disabled={isSubmitting}
      />
    </div>

    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Degisiklikler kaydedildiginde mevcut arac detayi ekranina donulecek.
      </p>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isSubmitting ? "Arac guncelleniyor..." : "Degisiklikleri kaydet"}
      </button>
    </div>
  </form>
) : null}
```

---

## 9. Bu ozellikler icin dokunulan dosyalarin kisa listesi

- `apps/api/src/modules/vehicles/vehicles.controller.ts`
- `apps/api/src/modules/vehicles/vehicles.service.ts`
- `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`
- `apps/api/src/modules/vehicles/dto/update-vehicle.dto.ts`
- `apps/web/src/lib/api/api-client.ts`
- `apps/web/src/lib/api/vehicles.ts`
- `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`
- `apps/web/src/app/dashboard/araclarim/[id]/duzenle/page.tsx`

---

## 10. Ogrenme sirasina gore silmek istersen

Ben olsam silip yeniden yazma denemesinde su sirayla giderdim:

1. `apps/api/src/modules/vehicles/dto/update-vehicle.dto.ts`
2. `apps/api/src/modules/vehicles/repositories/vehicles.repository.ts`
3. `apps/api/src/modules/vehicles/vehicles.service.ts`
4. `apps/api/src/modules/vehicles/vehicles.controller.ts`
5. `apps/web/src/lib/api/api-client.ts`
6. `apps/web/src/lib/api/vehicles.ts`
7. `apps/web/src/app/dashboard/araclarim/[id]/duzenle/page.tsx`
8. `apps/web/src/app/dashboard/araclarim/[id]/page.tsx`

Bu sirada sebep:
- once backend contract + DB erisimi
- sonra service
- sonra endpoint
- sonra frontend helper
- en sonda UI
