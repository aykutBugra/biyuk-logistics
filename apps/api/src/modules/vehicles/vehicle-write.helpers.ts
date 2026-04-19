import { Prisma, PrismaClient } from "@prisma/client";

type VehiclePrismaClient = Prisma.TransactionClient | PrismaClient;

export type VehicleDraft = {
  marka: string;
  model: string;
  plaka: string;
  yil: number;
  kapasite: number;
};

export type NormalizedVehicleDraft = VehicleDraft;

export type CreateVehicleForOwnerInput = VehicleDraft & {
  sahipId: number;
};

export function normalizeVehicleCanonicalText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeVehiclePlate(value: string): string {
  return normalizeVehicleCanonicalText(value);
}

export function normalizeVehicleDraft(
  input: VehicleDraft
): NormalizedVehicleDraft {
  return {
    marka: normalizeVehicleCanonicalText(input.marka),
    model: normalizeVehicleCanonicalText(input.model),
    plaka: normalizeVehiclePlate(input.plaka),
    yil: input.yil,
    kapasite: input.kapasite,
  };
}

export function isVehiclePlateUniqueConstraintTarget(targets: string[]): boolean {
  return targets.some((target) => {
    const normalizedTarget = target.trim().toLowerCase();

    return (
      normalizedTarget.includes("plaka") ||
      normalizedTarget.includes("arac_plaka_active_unique")
    );
  });
}

export async function resolveVehicleLibraryId(
  prisma: VehiclePrismaClient,
  marka: string,
  model: string
): Promise<number> {
  const vehicleLibrary = await prisma.aracKutuphanesi.findFirst({
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

  if (vehicleLibrary) {
    return vehicleLibrary.id;
  }

  const createdVehicleLibrary = await prisma.aracKutuphanesi.create({
    data: {
      marka,
      model,
    },
    select: {
      id: true,
    },
  });

  return createdVehicleLibrary.id;
}

export async function createVehicleForOwner(
  prisma: VehiclePrismaClient,
  input: CreateVehicleForOwnerInput
): Promise<number> {
  const normalizedVehicle = normalizeVehicleDraft(input);
  const aracKutuphaneId = await resolveVehicleLibraryId(
    prisma,
    normalizedVehicle.marka,
    normalizedVehicle.model
  );

  const createdVehicle = await prisma.arac.create({
    data: {
      sahipId: input.sahipId,
      aracKutuphaneId,
      plaka: normalizedVehicle.plaka,
      yil: normalizedVehicle.yil,
      kapasite: new Prisma.Decimal(normalizedVehicle.kapasite),
    },
    select: {
      id: true,
    },
  });

  return createdVehicle.id;
}
