import { Prisma, PrismaClient } from "@prisma/client";

type DurumClient = Pick<PrismaClient, "durum">;

export function normalizeDurumKey(value: string): string {
  return value.trim().toUpperCase();
}

export async function findDurumIdByTypeAndName(
  db: DurumClient,
  durumTuru: string,
  durumAdi: string
): Promise<number | null> {
  const status = await db.durum.findUnique({
    where: {
      durumTuru_durumAdi: {
        durumTuru: normalizeDurumKey(durumTuru),
        durumAdi: normalizeDurumKey(durumAdi),
      },
    },
    select: {
      id: true,
    },
  });

  return status?.id ?? null;
}

export type DurumKey = {
  durumTuru: string;
  durumAdi: string;
};

export async function findDurumIdByTypeAndNameWithLegacyFallback(
  db: DurumClient,
  durumTuru: string,
  durumAdi: string
): Promise<number | null> {
  const canonicalId = await findDurumIdByTypeAndName(db, durumTuru, durumAdi);

  if (canonicalId !== null) {
    return canonicalId;
  }

  const legacy = await db.durum.findFirst({
    where: {
      durumTuru: {
        equals: durumTuru,
        mode: Prisma.QueryMode.insensitive,
      },
      durumAdi: {
        equals: durumAdi,
        mode: Prisma.QueryMode.insensitive,
      },
    },
    select: {
      id: true,
    },
  });

  return legacy?.id ?? null;
}
