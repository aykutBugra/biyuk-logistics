import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type { StoredSubmittedRatingRecord } from "../../ratings/rating-context.helpers";

const transportRequestSelect = {
  id: true,
  baslangicSehri: true,
  varisSehri: true,
  baslangicKonumMetni: true,
  varisKonumMetni: true,
  baslangicProvider: true,
  varisProvider: true,
  baslangicPlaceId: true,
  varisPlaceId: true,
  normalizeBaslangicSehir: true,
  normalizeVarisSehir: true,
  normalizeBaslangicIlce: true,
  normalizeVarisIlce: true,
  baslangicEnlem: true,
  baslangicBoylam: true,
  varisEnlem: true,
  varisBoylam: true,
  tekTasimaIstiyor: true,
  agirlikKg: true,
  hacimM3: true,
  yukTipi: true,
  tasimaTarihi: true,
  yukDetay: true,
  olusturmaTarihi: true,
  durum: {
    select: {
      durumTuru: true,
      durumAdi: true,
    },
  },
  nakliye: {
    select: {
      id: true,
      anlasilanFiyat: true,
      olusturmaTarihi: true,
      baslangicTarihi: true,
      teslimTarihi: true,
      durum: {
        select: {
          durumTuru: true,
          durumAdi: true,
        },
      },
      nakliyeci: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          kullaniciAdi: true,
        },
      },
      arac: {
        select: {
          id: true,
          plaka: true,
        },
      },
      puanlar: {
        select: {
          id: true,
          puanlayanId: true,
          puanlananId: true,
          puanDegeri: true,
          yorum: true,
          tarih: true,
        },
      },
    },
  },
} satisfies Prisma.IstekSelect;

type StoredTransportRequestQuery = Prisma.IstekGetPayload<{
  select: typeof transportRequestSelect;
}>;

export type CreateTransportRequestRecordInput = {
  musteriId: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string;
  varisKonumMetni: string;
  baslangicProvider: string;
  varisProvider: string;
  baslangicPlaceId: string;
  varisPlaceId: string;
  normalizeBaslangicSehir: string;
  normalizeVarisSehir: string;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  tekTasimaIstiyor: boolean;
  agirlikKg: number;
  hacimM3: number;
  yukTipi: string;
  tasimaTarihi: string;
  yukDetay: string;
  durumId: number;
};

export type UpdateTransportRequestRecordInput = Omit<
  CreateTransportRequestRecordInput,
  "musteriId" | "durumId"
>;

export type StoredTransportRequestJobRecord = {
  id: number;
  carrierId: number;
  carrierName: string;
  carrierUsername: string;
  aracId: number;
  aracPlaka: string;
  durumTuru: string;
  anlasilanFiyat: number;
  durumAdi: string;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimTarihi: Date | null;
  ratings: StoredSubmittedRatingRecord[];
};

export type StoredTransportRequestRecord = {
  id: number;
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
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  yukDetay: string;
  olusturmaTarihi: Date;
  durumTuru: string;
  durumAdi: string;
  nakliye: StoredTransportRequestJobRecord | null;
};

@Injectable()
export class TransportRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStatusIdByTypeAndName(
    durumTuru: string,
    durumAdi: string
  ): Promise<number | null> {
    const status = await this.prisma.client.durum.findFirst({
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

    return status?.id ?? null;
  }

  async create(
    input: CreateTransportRequestRecordInput
  ): Promise<StoredTransportRequestRecord> {
    const transportRequest = await this.prisma.client.istek.create({
      data: {
        musteriId: input.musteriId,
        baslangicSehri: input.baslangicSehri,
        varisSehri: input.varisSehri,
        baslangicKonumMetni: input.baslangicKonumMetni,
        varisKonumMetni: input.varisKonumMetni,
        baslangicProvider: input.baslangicProvider,
        varisProvider: input.varisProvider,
        baslangicPlaceId: input.baslangicPlaceId,
        varisPlaceId: input.varisPlaceId,
        normalizeBaslangicSehir: input.normalizeBaslangicSehir,
        normalizeVarisSehir: input.normalizeVarisSehir,
        normalizeBaslangicIlce: input.normalizeBaslangicIlce,
        normalizeVarisIlce: input.normalizeVarisIlce,
        baslangicEnlem: new Prisma.Decimal(input.baslangicEnlem),
        baslangicBoylam: new Prisma.Decimal(input.baslangicBoylam),
        varisEnlem: new Prisma.Decimal(input.varisEnlem),
        varisBoylam: new Prisma.Decimal(input.varisBoylam),
        tekTasimaIstiyor: input.tekTasimaIstiyor,
        agirlikKg: new Prisma.Decimal(input.agirlikKg),
        hacimM3: new Prisma.Decimal(input.hacimM3),
        yukTipi: input.yukTipi,
        tasimaTarihi: input.tasimaTarihi,
        yukDetay: input.yukDetay,
        durumId: input.durumId,
      },
      select: transportRequestSelect,
    });

    return this.mapStoredTransportRequest(transportRequest);
  }

  async updateByIdAndCustomerId(
    id: number,
    musteriId: number,
    input: UpdateTransportRequestRecordInput
  ): Promise<StoredTransportRequestRecord | null> {
    const result = await this.prisma.client.istek.updateMany({
      where: {
        id,
        musteriId,
        silmeTarihi: null,
      },
      data: {
        baslangicSehri: input.baslangicSehri,
        varisSehri: input.varisSehri,
        baslangicKonumMetni: input.baslangicKonumMetni,
        varisKonumMetni: input.varisKonumMetni,
        baslangicProvider: input.baslangicProvider,
        varisProvider: input.varisProvider,
        baslangicPlaceId: input.baslangicPlaceId,
        varisPlaceId: input.varisPlaceId,
        normalizeBaslangicSehir: input.normalizeBaslangicSehir,
        normalizeVarisSehir: input.normalizeVarisSehir,
        normalizeBaslangicIlce: input.normalizeBaslangicIlce,
        normalizeVarisIlce: input.normalizeVarisIlce,
        baslangicEnlem: new Prisma.Decimal(input.baslangicEnlem),
        baslangicBoylam: new Prisma.Decimal(input.baslangicBoylam),
        varisEnlem: new Prisma.Decimal(input.varisEnlem),
        varisBoylam: new Prisma.Decimal(input.varisBoylam),
        tekTasimaIstiyor: input.tekTasimaIstiyor,
        agirlikKg: new Prisma.Decimal(input.agirlikKg),
        hacimM3: new Prisma.Decimal(input.hacimM3),
        yukTipi: input.yukTipi,
        tasimaTarihi: input.tasimaTarihi,
        yukDetay: input.yukDetay,
      },
    });

    if (result.count === 0) {
      return null;
    }

    const transportRequest = await this.prisma.client.istek.findFirst({
      where: {
        id,
        musteriId,
        silmeTarihi: null,
      },
      select: transportRequestSelect,
    });

    return transportRequest ? this.mapStoredTransportRequest(transportRequest) : null;
  }

  async softDeleteByIdAndCustomerId(id: number, musteriId: number): Promise<boolean> {
    const result = await this.prisma.client.istek.updateMany({
      where: {
        id,
        musteriId,
        silmeTarihi: null,
      },
      data: {
        silmeTarihi: new Date(),
      },
    });

    return result.count > 0;
  }

  async findManyByCustomerId(musteriId: number): Promise<StoredTransportRequestRecord[]> {
    const transportRequests = await this.prisma.client.istek.findMany({
      where: {
        musteriId,
        silmeTarihi: null,
      },
      orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
      select: transportRequestSelect,
    });

    return transportRequests.map((transportRequest) =>
      this.mapStoredTransportRequest(transportRequest)
    );
  }

  async findByIdAndCustomerId(
    id: number,
    musteriId: number
  ): Promise<StoredTransportRequestRecord | null> {
    const transportRequest = await this.prisma.client.istek.findFirst({
      where: {
        id,
        musteriId,
        silmeTarihi: null,
      },
      select: transportRequestSelect,
    });

    return transportRequest ? this.mapStoredTransportRequest(transportRequest) : null;
  }

  private mapStoredTransportRequest(
    transportRequest: StoredTransportRequestQuery
  ): StoredTransportRequestRecord {
    return {
      id: transportRequest.id,
      baslangicSehri: transportRequest.baslangicSehri,
      varisSehri: transportRequest.varisSehri,
      baslangicKonumMetni: transportRequest.baslangicKonumMetni,
      varisKonumMetni: transportRequest.varisKonumMetni,
      baslangicProvider: transportRequest.baslangicProvider,
      varisProvider: transportRequest.varisProvider,
      baslangicPlaceId: transportRequest.baslangicPlaceId,
      varisPlaceId: transportRequest.varisPlaceId,
      normalizeBaslangicSehir: transportRequest.normalizeBaslangicSehir,
      normalizeVarisSehir: transportRequest.normalizeVarisSehir,
      normalizeBaslangicIlce: transportRequest.normalizeBaslangicIlce,
      normalizeVarisIlce: transportRequest.normalizeVarisIlce,
      baslangicEnlem: transportRequest.baslangicEnlem.toNumber(),
      baslangicBoylam: transportRequest.baslangicBoylam.toNumber(),
      varisEnlem: transportRequest.varisEnlem.toNumber(),
      varisBoylam: transportRequest.varisBoylam.toNumber(),
      tekTasimaIstiyor: transportRequest.tekTasimaIstiyor,
      agirlikKg: transportRequest.agirlikKg?.toNumber() ?? null,
      hacimM3: transportRequest.hacimM3?.toNumber() ?? null,
      yukTipi: transportRequest.yukTipi,
      tasimaTarihi: transportRequest.tasimaTarihi,
      yukDetay: transportRequest.yukDetay,
      olusturmaTarihi: transportRequest.olusturmaTarihi,
      durumTuru: transportRequest.durum.durumTuru,
      durumAdi: transportRequest.durum.durumAdi,
      nakliye: transportRequest.nakliye
        ? {
            id: transportRequest.nakliye.id,
            carrierId: transportRequest.nakliye.nakliyeci.id,
            carrierName: `${transportRequest.nakliye.nakliyeci.ad} ${transportRequest.nakliye.nakliyeci.soyad}`.trim(),
            carrierUsername: transportRequest.nakliye.nakliyeci.kullaniciAdi,
            aracId: transportRequest.nakliye.arac.id,
            aracPlaka: transportRequest.nakliye.arac.plaka,
            durumTuru: transportRequest.nakliye.durum.durumTuru,
            anlasilanFiyat: transportRequest.nakliye.anlasilanFiyat.toNumber(),
            durumAdi: transportRequest.nakliye.durum.durumAdi,
            olusturmaTarihi: transportRequest.nakliye.olusturmaTarihi,
            baslangicTarihi: transportRequest.nakliye.baslangicTarihi,
            teslimTarihi: transportRequest.nakliye.teslimTarihi,
            ratings: transportRequest.nakliye.puanlar.map((rating) => ({
              id: rating.id,
              puanlayanId: rating.puanlayanId,
              puanlananId: rating.puanlananId,
              puanDegeri: rating.puanDegeri,
              yorum: rating.yorum,
              tarih: rating.tarih,
            })),
          }
        : null,
    };
  }
}
