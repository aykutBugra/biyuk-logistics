import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type CreateVehicleCapacityReservationInput,
  type VehicleCapacityReservationAggregateRecord,
  VehicleCapacityRepository,
} from "./repositories/vehicle-capacity.repository";

export const VEHICLE_CAPACITY_RELEASE_REASONS = {
  COMPLETED: "COMPLETED",
  VEHICLE_REASSIGNED: "VEHICLE_REASSIGNED",
  CANCELED: "CANCELED",
} as const;

export type VehicleCapacityReleaseReason =
  (typeof VEHICLE_CAPACITY_RELEASE_REASONS)[keyof typeof VEHICLE_CAPACITY_RELEASE_REASONS];

export type VehicleCapacityBase = {
  id: number;
  maksimumAgirlikKg: number;
  maksimumHacimM3: number | null;
};

export type VehicleCapacitySummary = {
  toplamAgirlikKg: number;
  toplamHacimM3: number | null;
  rezerveAgirlikKg: number;
  rezerveHacimM3: number;
  kalanAgirlikKg: number;
  kalanHacimM3: number | null;
  aktifRezervasyonSayisi: number;
  aktifTekTasimaRezervasyonuVar: boolean;
  hesapEksigiVar: boolean;
};

@Injectable()
export class VehicleCapacityService {
  constructor(
    private readonly vehicleCapacityRepository: VehicleCapacityRepository
  ) {}

  async createReservationForShipment(
    input: CreateVehicleCapacityReservationInput,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    await this.vehicleCapacityRepository.createActiveReservation(input, executor);
  }

  async releaseReservationByShipmentId(
    shipmentId: number,
    releaseReason: VehicleCapacityReleaseReason,
    executor?: Prisma.TransactionClient
  ): Promise<boolean> {
    return this.vehicleCapacityRepository.releaseActiveReservationByShipmentId(
      shipmentId,
      releaseReason,
      executor
    );
  }

  async reassignReservationToVehicle(
    shipmentId: number,
    nextVehicleId: number,
    executor?: Prisma.TransactionClient
  ): Promise<boolean> {
    const activeReservation =
      await this.vehicleCapacityRepository.findActiveReservationByShipmentId(
        shipmentId,
        executor
      );

    if (!activeReservation) {
      return false;
    }

    if (activeReservation.vehicleId === nextVehicleId) {
      return true;
    }

    await this.vehicleCapacityRepository.releaseActiveReservationByShipmentId(
      shipmentId,
      VEHICLE_CAPACITY_RELEASE_REASONS.VEHICLE_REASSIGNED,
      executor
    );

    await this.vehicleCapacityRepository.createActiveReservation(
      {
        vehicleId: nextVehicleId,
        shipmentId: activeReservation.shipmentId,
        requestId: activeReservation.requestId,
        offerId: activeReservation.offerId,
        reservedAgirlikKg: activeReservation.reservedAgirlikKg,
        reservedHacimM3: activeReservation.reservedHacimM3,
        isDedicated: activeReservation.isDedicated,
      },
      executor
    );

    return true;
  }

  async getCapacitySummaryMapForVehicles(
    vehicles: VehicleCapacityBase[]
  ): Promise<Map<number, VehicleCapacitySummary>> {
    const summaries = new Map<number, VehicleCapacitySummary>();

    if (vehicles.length === 0) {
      return summaries;
    }

    const reservations =
      await this.vehicleCapacityRepository.findActiveReservationsByVehicleIds(
        vehicles.map((vehicle) => vehicle.id)
      );
    const reservationsByVehicleId = this.groupReservationsByVehicleId(reservations);

    for (const vehicle of vehicles) {
      const vehicleReservations = reservationsByVehicleId.get(vehicle.id) ?? [];
      const hasMissingReservationData = vehicleReservations.some(
        (reservation) =>
          reservation.reservedAgirlikKg === null ||
          reservation.reservedHacimM3 === null
      );
      const rezerveAgirlikKg = vehicleReservations.reduce(
        (total, reservation) => total + (reservation.reservedAgirlikKg ?? 0),
        0
      );
      const rezerveHacimM3 = vehicleReservations.reduce(
        (total, reservation) => total + (reservation.reservedHacimM3 ?? 0),
        0
      );

      summaries.set(vehicle.id, {
        toplamAgirlikKg: vehicle.maksimumAgirlikKg,
        toplamHacimM3: vehicle.maksimumHacimM3,
        rezerveAgirlikKg,
        rezerveHacimM3,
        kalanAgirlikKg: vehicle.maksimumAgirlikKg - rezerveAgirlikKg,
        kalanHacimM3:
          vehicle.maksimumHacimM3 === null
            ? null
            : vehicle.maksimumHacimM3 - rezerveHacimM3,
        aktifRezervasyonSayisi: vehicleReservations.length,
        aktifTekTasimaRezervasyonuVar: vehicleReservations.some(
          (reservation) => reservation.isDedicated
        ),
        hesapEksigiVar:
          hasMissingReservationData || vehicle.maksimumHacimM3 === null,
      });
    }

    return summaries;
  }

  private groupReservationsByVehicleId(
    reservations: VehicleCapacityReservationAggregateRecord[]
  ): Map<number, VehicleCapacityReservationAggregateRecord[]> {
    const groupedReservations = new Map<
      number,
      VehicleCapacityReservationAggregateRecord[]
    >();

    for (const reservation of reservations) {
      const currentReservations =
        groupedReservations.get(reservation.vehicleId) ?? [];
      currentReservations.push(reservation);
      groupedReservations.set(reservation.vehicleId, currentReservations);
    }

    return groupedReservations;
  }
}
