import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const transportRequestSelect = {
  id: true,
  baslangicSehri: true,
  varisSehri: true,
  baslangicEnlem: true,
  baslangicBoylam: true,
  varisEnlem: true,
  varisBoylam: true,
  yukDetay: true,
  olusturmaTarihi: true,
  durum: {
    select: {
      durumTuru: true,
      durumAdi: true,
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
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  yukDetay: string;
  durumId: number;
};

export type StoredTransportRequestRecord = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  yukDetay: string;
  olusturmaTarihi: Date;
  durumTuru: string;
  durumAdi: string;
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
        baslangicEnlem: new Prisma.Decimal(input.baslangicEnlem),
        baslangicBoylam: new Prisma.Decimal(input.baslangicBoylam),
        varisEnlem: new Prisma.Decimal(input.varisEnlem),
        varisBoylam: new Prisma.Decimal(input.varisBoylam),
        yukDetay: input.yukDetay,
        durumId: input.durumId,
      },
      select: transportRequestSelect,
    });

    return this.mapStoredTransportRequest(transportRequest);
  }


  async findManyByCustomerId(musteriId: number): Promise<StoredTransportRequestRecord[]> {
    const transportRequests = await this.prisma.client.istek.findMany({
      where: {
        musteriId,
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
      baslangicEnlem: transportRequest.baslangicEnlem.toNumber(),
      baslangicBoylam: transportRequest.baslangicBoylam.toNumber(),
      varisEnlem: transportRequest.varisEnlem.toNumber(),
      varisBoylam: transportRequest.varisBoylam.toNumber(),
      yukDetay: transportRequest.yukDetay,
      olusturmaTarihi: transportRequest.olusturmaTarihi,
      durumTuru: transportRequest.durum.durumTuru,
      durumAdi: transportRequest.durum.durumAdi,
    };
  }
}
