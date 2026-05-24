import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const vehicleSelect = {
  id: true,
  publicId: true,
  plaka: true,
  yil: true,
  maksimumAgirlikKg: true,
  maksimumHacimM3: true,
  kasaTipi: true,
  uzunlukCm: true,
  genislikCm: true,
  yukseklikCm: true,
  aracFotografiStorageKey: true,
  aracBilgisi: {
    select: {
      marka: true,
      model: true,
    },
  },
} satisfies Prisma.AracSelect;

//Arac sorgularinda ortak kullanilan select yapisi. Marka/model AracKutuphanesi
//iliski tablosundan gelir, servis tarafina tek kayit gibi aktarilir.
type StoredVehicleQuery = Prisma.AracGetPayload<{
  select: typeof vehicleSelect;
}>;

export type CreateVehicleRecordInput = {
  sahipId: number;
  aracKutuphaneId: number;
  plaka: string;
  yil: number;
  maksimumAgirlikKg: number;
  maksimumHacimM3: number;
  kasaTipi: string;
  uzunlukCm?: number;
  genislikCm?: number;
  yukseklikCm?: number;
};

export type UpdateVehicleRecordInput = Omit<CreateVehicleRecordInput, "sahipId">;

export type CreateVehicleLibraryRecordInput = {
  marka: string;
  model: string;
};

export type StoredVehicleRecord = {
  id: number;
  publicId: string;
  plaka: string;
  marka: string;
  model: string;
  yil: number;
  maksimumAgirlikKg: number;
  maksimumHacimM3: number | null;
  kasaTipi: string;
  uzunlukCm: number | null;
  genislikCm: number | null;
  yukseklikCm: number | null;
  aracFotografiStorageKey: string | null;
};

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  //Marka/model kombinasyonu kutuphanede daha once varsa yeni kayit acmadan id'sini kullaniriz.
  async findVehicleLibraryByBrandAndModel(
    marka: string,
    model: string
  ): Promise<number | null> {
    const vehicleLibrary = await this.prisma.client.aracKutuphanesi.findFirst({
      where: {
        marka: {
          equals: marka,
          mode: Prisma.QueryMode.insensitive,
        },
        model: {
          equals: model,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    });

    return vehicleLibrary?.id ?? null;
  }

  async createVehicleLibrary(
    input: CreateVehicleLibraryRecordInput
  ): Promise<number> {
    //Kutuphanede olmayan marka/model icin yeni referans kaydi olusturur.
    const vehicleLibrary = await this.prisma.client.aracKutuphanesi.create({
      data: {
        marka: input.marka,
        model: input.model,
      },
      select: {
        id: true,
      },
    });

    return vehicleLibrary.id;
  }

  async create(input: CreateVehicleRecordInput): Promise<StoredVehicleRecord> {
    //Arac kaydi olusturulurken kapasite alanlari Decimal olarak saklanir.
    const vehicle = await this.prisma.client.arac.create({
      data: {
        sahipId: input.sahipId,
        aracKutuphaneId: input.aracKutuphaneId,
        plaka: input.plaka,
        yil: input.yil,
        maksimumAgirlikKg: new Prisma.Decimal(input.maksimumAgirlikKg),
        maksimumHacimM3: new Prisma.Decimal(input.maksimumHacimM3),
        kasaTipi: input.kasaTipi,
        uzunlukCm: input.uzunlukCm,
        genislikCm: input.genislikCm,
        yukseklikCm: input.yukseklikCm,
      },
      select: vehicleSelect,
    });

    return this.mapStoredVehicle(vehicle);
  }

  async softDeleteByIdAndOwnerId(
    id: PublicEntityId,
    sahipId: number
  ): Promise<boolean> {
    //Araclar fiziksel olarak silinmez; sahiplik ve aktiflik kosuluyla silmeTarihi setlenir.
    const result = await this.prisma.client.arac.updateMany({
      where: {
        ...publicEntityWhere(id),
        sahipId,
        silmeTarihi: null,
      },
      data: {
        silmeTarihi: new Date(),
      },
    });

    return result.count > 0;
  }

  async updateByIdAndOwnerId(
    id: PublicEntityId,
    sahipId: number,
    input: UpdateVehicleRecordInput
  ): Promise<StoredVehicleRecord | null> {
    //Guncelleme sahiplik kontroluyle yapilir; baskasinin araci update edilemez.
    const result = await this.prisma.client.arac.updateMany({
      where: {
        ...publicEntityWhere(id),
        sahipId,
        silmeTarihi: null,
      },
      data: {
        aracKutuphaneId: input.aracKutuphaneId,
        plaka: input.plaka,
        yil: input.yil,
        maksimumAgirlikKg: new Prisma.Decimal(input.maksimumAgirlikKg),
        maksimumHacimM3: new Prisma.Decimal(input.maksimumHacimM3),
        kasaTipi: input.kasaTipi,
        uzunlukCm: input.uzunlukCm,
        genislikCm: input.genislikCm,
        yukseklikCm: input.yukseklikCm,
      },
    });

    if (result.count === 0) {
      return null;
    }

    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        ...publicEntityWhere(id),
        sahipId,
        silmeTarihi: null,
      },
      select: vehicleSelect,
    });

    return vehicle ? this.mapStoredVehicle(vehicle) : null;
  }

  async hasNonTerminalShipmentByIdAndOwnerId(
    id: PublicEntityId,
    sahipId: number
  ): Promise<boolean> {
    //Tamamlanmamis nakliye varsa arac silme engellenir.
    const shipment = await this.prisma.client.nakliye.findFirst({
      where: {
        arac: {
          ...publicEntityWhere(id),
          sahipId,
        },
        NOT: {
          durum: {
            durumTuru: {
              equals: "NAKLIYE",
              mode: Prisma.QueryMode.insensitive,
            },
            durumAdi: {
              equals: "TAMAMLANDI",
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(shipment);
  }

  async findManyByOwnerId(sahipId: number): Promise<StoredVehicleRecord[]> {
    //Nakliyecinin sadece aktif araclari listelenir.
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

  async findByIdAndOwnerId(
    id: PublicEntityId,
    sahipId: number
  ): Promise<StoredVehicleRecord | null> {
    //Detay okuma da id+sahipId ile yapilir; sahip olmayan kullanici null alir.
    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        ...publicEntityWhere(id),
        sahipId,
        silmeTarihi: null,
      },
      select: vehicleSelect,
    });

    return vehicle ? this.mapStoredVehicle(vehicle) : null;
  }

  async updateImageStorageKeyByIdAndOwnerId(
    id: PublicEntityId,
    sahipId: number,
    storageKey: string | null
  ): Promise<StoredVehicleRecord | null> {
    //Arac fotografi storage key'i sahiplik ve soft delete filtresiyle guncellenir.
    const result = await this.prisma.client.arac.updateMany({
      where: {
        ...publicEntityWhere(id),
        sahipId,
        silmeTarihi: null,
      },
      data: {
        aracFotografiStorageKey: storageKey,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findByIdAndOwnerId(id, sahipId);
  }

  private mapStoredVehicle(vehicle: StoredVehicleQuery): StoredVehicleRecord {
    //Prisma Decimal ve nested aracBilgisi kaydini service'in kullandigi sade tipe cevirir.
    return {
      id: vehicle.id,
      publicId: vehicle.publicId,
      plaka: vehicle.plaka,
      marka: vehicle.aracBilgisi.marka,
      model: vehicle.aracBilgisi.model,
      yil: vehicle.yil,
      maksimumAgirlikKg: vehicle.maksimumAgirlikKg.toNumber(),
      maksimumHacimM3: vehicle.maksimumHacimM3?.toNumber() ?? null,
      kasaTipi: vehicle.kasaTipi,
      uzunlukCm: vehicle.uzunlukCm,
      genislikCm: vehicle.genislikCm,
      yukseklikCm: vehicle.yukseklikCm,
      aracFotografiStorageKey: vehicle.aracFotografiStorageKey,
    };
  }
}
