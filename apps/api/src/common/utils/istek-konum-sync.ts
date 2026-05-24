import { KonumYonu, Prisma } from "@prisma/client";

export type IstekFlatLocationFields = {
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
};

export type IstekKonumUpsertInput = {
  yon: KonumYonu;
  provider: string | null;
  placeId: string | null;
  konumMetni: string | null;
  sehir: string;
  ilce: string | null;
  enlem: Prisma.Decimal;
  boylam: Prisma.Decimal;
};

export function buildIstekKonumUpsertsFromFlatFields(
  input: IstekFlatLocationFields
): IstekKonumUpsertInput[] {
  const baslangicSehir =
    input.normalizeBaslangicSehir?.trim() || input.baslangicSehri.trim();
  const varisSehir = input.normalizeVarisSehir?.trim() || input.varisSehri.trim();

  return [
    {
      yon: KonumYonu.BASLANGIC,
      provider: input.baslangicProvider,
      placeId: input.baslangicPlaceId,
      konumMetni: input.baslangicKonumMetni,
      sehir: baslangicSehir,
      ilce: input.normalizeBaslangicIlce,
      enlem: new Prisma.Decimal(input.baslangicEnlem),
      boylam: new Prisma.Decimal(input.baslangicBoylam),
    },
    {
      yon: KonumYonu.VARIS,
      provider: input.varisProvider,
      placeId: input.varisPlaceId,
      konumMetni: input.varisKonumMetni,
      sehir: varisSehir,
      ilce: input.normalizeVarisIlce,
      enlem: new Prisma.Decimal(input.varisEnlem),
      boylam: new Prisma.Decimal(input.varisBoylam),
    },
  ];
}

type IstekKonumRecord = {
  yon: KonumYonu;
  provider: string | null;
  placeId: string | null;
  konumMetni: string | null;
  sehir: string;
  ilce: string | null;
  enlem: Prisma.Decimal;
  boylam: Prisma.Decimal;
};

export function mergeIstekFlatFieldsWithKonumlar<T extends IstekFlatLocationFields>(
  flat: T,
  konumlar: IstekKonumRecord[] | undefined
): T {
  if (!konumlar || konumlar.length === 0) {
    return flat;
  }

  const baslangic = konumlar.find((k) => k.yon === KonumYonu.BASLANGIC);
  const varis = konumlar.find((k) => k.yon === KonumYonu.VARIS);

  if (!baslangic && !varis) {
    return flat;
  }

  return {
    ...flat,
    ...(baslangic
      ? {
          baslangicSehri: baslangic.sehir,
          normalizeBaslangicSehir: baslangic.sehir,
          baslangicKonumMetni: baslangic.konumMetni,
          baslangicProvider: baslangic.provider,
          baslangicPlaceId: baslangic.placeId,
          normalizeBaslangicIlce: baslangic.ilce,
          baslangicEnlem: Number(baslangic.enlem),
          baslangicBoylam: Number(baslangic.boylam),
        }
      : {}),
    ...(varis
      ? {
          varisSehri: varis.sehir,
          normalizeVarisSehir: varis.sehir,
          varisKonumMetni: varis.konumMetni,
          varisProvider: varis.provider,
          varisPlaceId: varis.placeId,
          normalizeVarisIlce: varis.ilce,
          varisEnlem: Number(varis.enlem),
          varisBoylam: Number(varis.boylam),
        }
      : {}),
  };
}

export function parseDateOnlyToDbDate(
  value: string | null | undefined
): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return new Date(`${trimmed}T00:00:00.000Z`);
}

export function formatDbDateToDateOnly(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}
