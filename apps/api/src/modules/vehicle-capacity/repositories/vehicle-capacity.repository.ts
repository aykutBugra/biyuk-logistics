import { Prisma, PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

//Nakliye olustugunda aracin aktif kapasitesinden dusulecek rezervasyon girdisi.
export type CreateVehicleCapacityReservationInput = {
  vehicleId: number;
  shipmentId: number;
  requestId: number;
  offerId: number;
  reservedAgirlikKg: number | null;
  reservedHacimM3: number | null;
  isDedicated: boolean;
};

export type ActiveVehicleCapacityReservationRecord = {
  id: number;
  vehicleId: number;
  shipmentId: number;
  requestId: number;
  offerId: number;
  reservedAgirlikKg: number | null;
  reservedHacimM3: number | null;
  isDedicated: boolean;
};

export type VehicleCapacityReservationAggregateRecord = {
  vehicleId: number;
  reservedAgirlikKg: number | null;
  reservedHacimM3: number | null;
  isDedicated: boolean;
};

@Injectable()
export class VehicleCapacityRepository {
  constructor(private readonly prisma: PrismaService) {}

  //Aktif kapasite rezervasyonu olusturur. Decimal alanlar DB'ye yazilirken
  //Prisma.Decimal'a cevrilir.
  async createActiveReservation(
    input: CreateVehicleCapacityReservationInput,
    executor?: PrismaExecutor
  ): Promise<void> {
    const db = this.getExecutor(executor);

    await db.vehicleCapacityReservation.create({
      data: {
        vehicleId: input.vehicleId,
        shipmentId: input.shipmentId,
        requestId: input.requestId,
        offerId: input.offerId,
        reservedAgirlikKg:
          input.reservedAgirlikKg === null
            ? null
            : new Prisma.Decimal(input.reservedAgirlikKg),
        reservedHacimM3:
          input.reservedHacimM3 === null
            ? null
            : new Prisma.Decimal(input.reservedHacimM3),
        isDedicated: input.isDedicated,
      },
    });
  }

  async releaseActiveReservationByShipmentId(
    shipmentId: number,
    releaseReason: string,
    executor?: PrismaExecutor
  ): Promise<boolean> {
    //Shipment icin henuz releasedAt almamis rezervasyonu kapatir ve neden bilgisini yazar.
    const db = this.getExecutor(executor);
    const result = await db.vehicleCapacityReservation.updateMany({
      where: {
        shipmentId,
        releasedAt: null,
      },
      data: {
        releasedAt: new Date(),
        releaseReason,
      },
    });

    return result.count > 0;
  }

  async findActiveReservationByShipmentId(
    shipmentId: number,
    executor?: PrismaExecutor
  ): Promise<ActiveVehicleCapacityReservationRecord | null> {
    //Arac degistirme gibi islemlerde mevcut aktif rezervasyon snapshot'i gerekir.
    const db = this.getExecutor(executor);
    const reservation = await db.vehicleCapacityReservation.findFirst({
      where: {
        shipmentId,
        releasedAt: null,
      },
      select: {
        id: true,
        vehicleId: true,
        shipmentId: true,
        requestId: true,
        offerId: true,
        reservedAgirlikKg: true,
        reservedHacimM3: true,
        isDedicated: true,
      },
    });

    if (!reservation) {
      return null;
    }

    return {
      id: reservation.id,
      vehicleId: reservation.vehicleId,
      shipmentId: reservation.shipmentId,
      requestId: reservation.requestId,
      offerId: reservation.offerId,
      reservedAgirlikKg: reservation.reservedAgirlikKg?.toNumber() ?? null,
      reservedHacimM3: reservation.reservedHacimM3?.toNumber() ?? null,
      isDedicated: reservation.isDedicated,
    };
  }

  async findActiveReservationsByVehicleIds(
    vehicleIds: number[],
    executor?: PrismaExecutor
  ): Promise<VehicleCapacityReservationAggregateRecord[]> {
    //Birden fazla arac icin aktif rezervasyonlari tek sorguda cekerek liste ekranlarini besler.
    if (vehicleIds.length === 0) {
      return [];
    }

    const db = this.getExecutor(executor);
    const reservations = await db.vehicleCapacityReservation.findMany({
      where: {
        vehicleId: {
          in: vehicleIds,
        },
        releasedAt: null,
      },
      select: {
        vehicleId: true,
        reservedAgirlikKg: true,
        reservedHacimM3: true,
        isDedicated: true,
      },
    });

    return reservations.map((reservation) => ({
      vehicleId: reservation.vehicleId,
      reservedAgirlikKg: reservation.reservedAgirlikKg?.toNumber() ?? null,
      reservedHacimM3: reservation.reservedHacimM3?.toNumber() ?? null,
      isDedicated: reservation.isDedicated,
    }));
  }

  private getExecutor(executor?: PrismaExecutor): PrismaExecutor {
    //Transaction icinden cagrilirsa tx kullanilir, aksi halde normal Prisma client kullanilir.
    return executor ?? this.prisma.client;
  }
}
