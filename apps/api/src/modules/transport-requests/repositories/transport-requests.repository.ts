import { Prisma, PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type { StoredSubmittedRatingRecord } from "../../ratings/rating-context.helpers";

const transportRequestImageSelect = {
  id: true,
  storageKey: true,
  thumbnailStorageKey: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  sortOrder: true,
  isPrimary: true,
  originalFileName: true,
  createdAt: true,
} satisfies Prisma.IstekGorselSelect;

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
  rotaMesafeMetre: true,
  rotaSureSaniye: true,
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
  gorseller: {
    where: {
      silmeTarihi: null,
    },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
    select: transportRequestImageSelect,
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

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

type StoredTransportRequestQuery = Prisma.IstekGetPayload<{
  select: typeof transportRequestSelect;
}>;

type StoredTransportRequestImageQuery = Prisma.IstekGorselGetPayload<{
  select: typeof transportRequestImageSelect;
}>;

export type CreateTransportRequestRecordInput = {
  musteriId: number;
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
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
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

export type CreateTransportRequestImageRecordInput = {
  requestId: number;
  storageKey: string;
  thumbnailStorageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  isPrimary: boolean;
  originalFileName: string;
};

export type StoredTransportRequestImageRecord = {
  id: number;
  storageKey: string;
  thumbnailStorageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  isPrimary: boolean;
  originalFileName: string;
  createdAt: Date;
};

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
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
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
  images: StoredTransportRequestImageRecord[];
  primaryImageId: number | null;
  imageCount: number;
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
        rotaMesafeMetre: input.rotaMesafeMetre,
        rotaSureSaniye: input.rotaSureSaniye,
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
        rotaMesafeMetre: input.rotaMesafeMetre,
        rotaSureSaniye: input.rotaSureSaniye,
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

  async countActiveImagesByRequestId(
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<number> {
    const db = this.getExecutor(executor);
    return db.istekGorsel.count({
      where: {
        istekId: requestId,
        silmeTarihi: null,
      },
    });
  }

  async findNextImageSortOrder(
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<number> {
    const db = this.getExecutor(executor);
    const lastImage = await db.istekGorsel.findFirst({
      where: {
        istekId: requestId,
        silmeTarihi: null,
      },
      orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
      select: {
        sortOrder: true,
      },
    });

    return lastImage ? lastImage.sortOrder + 1 : 0;
  }

  async createImages(
    inputs: CreateTransportRequestImageRecordInput[],
    executor?: PrismaExecutor
  ): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    const db = this.getExecutor(executor);
    await db.istekGorsel.createMany({
      data: inputs.map((input) => ({
        istekId: input.requestId,
        storageKey: input.storageKey,
        thumbnailStorageKey: input.thumbnailStorageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        width: input.width,
        height: input.height,
        sortOrder: input.sortOrder,
        isPrimary: input.isPrimary,
        originalFileName: input.originalFileName,
      })),
    });
  }

  async clearActivePrimaryByRequestId(
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<void> {
    const db = this.getExecutor(executor);
    await db.istekGorsel.updateMany({
      where: {
        istekId: requestId,
        silmeTarihi: null,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  }

  async setPrimaryImageByIdAndRequestId(
    imageId: number,
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<boolean> {
    const db = this.getExecutor(executor);
    const result = await db.istekGorsel.updateMany({
      where: {
        id: imageId,
        istekId: requestId,
        silmeTarihi: null,
      },
      data: {
        isPrimary: true,
      },
    });

    return result.count > 0;
  }

  async findActiveImageByIdAndRequestId(
    imageId: number,
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<StoredTransportRequestImageRecord | null> {
    const db = this.getExecutor(executor);
    const image = await db.istekGorsel.findFirst({
      where: {
        id: imageId,
        istekId: requestId,
        silmeTarihi: null,
      },
      select: transportRequestImageSelect,
    });

    return image ? this.mapStoredTransportRequestImage(image) : null;
  }

  async softDeleteImageByIdAndRequestId(
    imageId: number,
    requestId: number,
    deletedAt: Date,
    executor?: PrismaExecutor
  ): Promise<boolean> {
    const db = this.getExecutor(executor);
    const result = await db.istekGorsel.updateMany({
      where: {
        id: imageId,
        istekId: requestId,
        silmeTarihi: null,
      },
      data: {
        silmeTarihi: deletedAt,
        isPrimary: false,
      },
    });

    return result.count > 0;
  }

  private getExecutor(executor?: PrismaExecutor): PrismaExecutor {
    return executor ?? this.prisma.client;
  }

  private mapStoredTransportRequest(
    transportRequest: StoredTransportRequestQuery
  ): StoredTransportRequestRecord {
    const images = transportRequest.gorseller.map((image) =>
      this.mapStoredTransportRequestImage(image)
    );
    const primaryImage = images.find((image) => image.isPrimary) ?? null;

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
      rotaMesafeMetre: transportRequest.rotaMesafeMetre,
      rotaSureSaniye: transportRequest.rotaSureSaniye,
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
      images,
      primaryImageId: primaryImage?.id ?? null,
      imageCount: images.length,
    };
  }

  private mapStoredTransportRequestImage(
    image: StoredTransportRequestImageQuery
  ): StoredTransportRequestImageRecord {
    return {
      id: image.id,
      storageKey: image.storageKey,
      thumbnailStorageKey: image.thumbnailStorageKey,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      width: image.width,
      height: image.height,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      originalFileName: image.originalFileName,
      createdAt: image.createdAt,
    };
  }
}
