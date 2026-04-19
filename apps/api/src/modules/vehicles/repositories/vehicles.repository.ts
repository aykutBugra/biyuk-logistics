import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const vehicleSelect = {
  id: true,
  plaka: true,
  yil: true,
  kapasite: true,
  aracBilgisi: {
    select: {
      marka: true,
      model: true,
    },
  },
} satisfies Prisma.AracSelect;

type StoredVehicleQuery = Prisma.AracGetPayload<{
  select: typeof vehicleSelect;
}>;

export type CreateVehicleRecordInput = {
  sahipId: number;
  aracKutuphaneId: number;
  plaka: string;
  yil: number;
  kapasite: number;
};

export type UpdateVehicleRecordInput = Omit<CreateVehicleRecordInput, "sahipId">;

export type CreateVehicleLibraryRecordInput = {
  marka: string;
  model: string;
};

export type StoredVehicleRecord = {
  id: number;
  plaka: string;
  marka: string;
  model: string;
  yil: number;
  kapasite: number;
};

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const vehicle = await this.prisma.client.arac.create({
      data: {
        sahipId: input.sahipId,
        aracKutuphaneId: input.aracKutuphaneId,
        plaka: input.plaka,
        yil: input.yil,
        kapasite: new Prisma.Decimal(input.kapasite),
      },
      select: vehicleSelect,
    });

    return this.mapStoredVehicle(vehicle);
  }

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

  async updateByIdAndOwnerId(
    id: number,
    sahipId: number,
    input: UpdateVehicleRecordInput
  ): Promise<StoredVehicleRecord | null> {
    const result = await this.prisma.client.arac.updateMany({
      where: {
        id,
        sahipId,
        silmeTarihi: null,
      },
      data: {
        aracKutuphaneId: input.aracKutuphaneId,
        plaka: input.plaka,
        yil: input.yil,
        kapasite: new Prisma.Decimal(input.kapasite),
      },
    });

    if (result.count === 0) {
      return null;
    }

    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        id,
        sahipId,
        silmeTarihi: null,
      },
      select: vehicleSelect,
    });

    return vehicle ? this.mapStoredVehicle(vehicle) : null;
  }

  async hasNonTerminalShipmentByIdAndOwnerId(
    id: number,
    sahipId: number
  ): Promise<boolean> {
    const shipment = await this.prisma.client.nakliye.findFirst({
      where: {
        aracId: id,
        arac: {
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
    id: number,
    sahipId: number
  ): Promise<StoredVehicleRecord | null> {
    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        id,
        sahipId,
        silmeTarihi: null,
      },
      select: vehicleSelect,
    });

    return vehicle ? this.mapStoredVehicle(vehicle) : null;
  }

  private mapStoredVehicle(vehicle: StoredVehicleQuery): StoredVehicleRecord {
    return {
      id: vehicle.id,
      plaka: vehicle.plaka,
      marka: vehicle.aracBilgisi.marka,
      model: vehicle.aracBilgisi.model,
      yil: vehicle.yil,
      kapasite: vehicle.kapasite.toNumber(),
    };
  }
}
