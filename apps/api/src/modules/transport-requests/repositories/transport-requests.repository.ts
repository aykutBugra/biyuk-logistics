import { Prisma, PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { findDurumIdByTypeAndNameWithLegacyFallback } from "../../../common/utils/durum-lookup";
import {
  buildIstekKonumUpsertsFromFlatFields,
  mergeIstekFlatFieldsWithKonumlar,
  parseDateOnlyToDbDate,
} from "../../../common/utils/istek-konum-sync";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type { StoredSubmittedRatingRecord } from "../../ratings/rating-context.helpers";

const transportRequestImageSelect = {
  id: true,
  publicId: true,
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

//Istek detay ve liste ekranlarinin ihtiyac duydugu ana istek, gorsel ve varsa
//nakliye iliskilerini tek select yapisinda toplar.
const transportRequestSelect = {
  id: true,
  publicId: true,
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
  konumlar: {
    select: {
      yon: true,
      provider: true,
      placeId: true,
      konumMetni: true,
      sehir: true,
      ilce: true,
      enlem: true,
      boylam: true,
    },
  },
  nakliye: {
    select: {
      id: true,
      publicId: true,
      anlasilanFiyat: true,
      olusturmaTarihi: true,
      baslangicTarihi: true,
      teslimBildirimTarihi: true,
      teslimTarihi: true,
      planlananAlimTarihi: true,
      tahminiTeslimTarihi: true,
      durum: {
        select: {
          durumTuru: true,
          durumAdi: true,
        },
      },
      nakliyeci: {
        select: {
          id: true,
          publicId: true,
          ad: true,
          soyad: true,
          kullaniciAdi: true,
        },
      },
      arac: {
        select: {
          id: true,
          publicId: true,
          plaka: true,
        },
      },
      puanlar: {
        select: {
          id: true,
          publicId: true,
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
type EntityIdSelector = PublicEntityId | number;

//Prisma'nin ham Istek sonucunu repository'nin service'e dondurdugu tipe baglar.
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
  publicId: string;
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
  publicId: string;
  carrierId: number;
  carrierPublicId: string;
  carrierName: string;
  carrierUsername: string;
  aracId: number;
  aracPublicId: string;
  aracPlaka: string;
  durumTuru: string;
  anlasilanFiyat: number;
  durumAdi: string;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimBildirimTarihi: Date | null;
  teslimTarihi: Date | null;
  planlananAlimTarihi: Date | null;
  tahminiTeslimTarihi: Date | null;
  ratings: StoredSubmittedRatingRecord[];
};

export type StoredTransportRequestRecord = {
  id: number;
  publicId: string;
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

  //Durum tablosunda tur/ad ikilisine gore id bulur. Yeni istek acarken
  //ISTEK/OLUSTURULDU id'si bu metotla cozulur.
  async findStatusIdByTypeAndName(
    durumTuru: string,
    durumAdi: string
  ): Promise<number | null> {
    return findDurumIdByTypeAndNameWithLegacyFallback(
      this.prisma.client,
      durumTuru,
      durumAdi
    );
  }

  async create(
    input: CreateTransportRequestRecordInput
  ): Promise<StoredTransportRequestRecord> {
    //Istek kaydi olusturulurken koordinat ve hacim gibi Decimal alanlar Prisma.Decimal'a
    //cevrilir; service katmani number ile calismaya devam eder.
    const transportRequest = await this.prisma.client.istek.create({
      data: {
        ...this.buildIstekFlatWriteData(input),
        musteriId: input.musteriId,
        durumId: input.durumId,
        konumlar: {
          create: buildIstekKonumUpsertsFromFlatFields(input),
        },
      },
      select: transportRequestSelect,
    });

    return this.mapStoredTransportRequest(transportRequest);
  }

  async updateByIdAndCustomerId(
    id: PublicEntityId,
    musteriId: number,
    input: UpdateTransportRequestRecordInput
  ): Promise<StoredTransportRequestRecord | null> {
    //Hem id hem musteriId ile updateMany kullanilmasi sahiplik kontrolunu DB seviyesine
    //indirir; baska musterinin istegi guncellenemez.
    const result = await this.prisma.client.istek.updateMany({
      where: {
        ...publicEntityWhere(id),
        musteriId,
        silmeTarihi: null,
      },
      data: this.buildIstekFlatWriteData(input),
    });

    if (result.count === 0) {
      return null;
    }

    const existing = await this.prisma.client.istek.findFirst({
      where: {
        ...publicEntityWhere(id),
        musteriId,
        silmeTarihi: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return null;
    }

    await this.syncKonumlarForIstek(existing.id, input);

    const transportRequest = await this.prisma.client.istek.findFirst({
      where: {
        id: existing.id,
      },
      select: transportRequestSelect,
    });

    return transportRequest ? this.mapStoredTransportRequest(transportRequest) : null;
  }

  async softDeleteByIdAndCustomerId(
    id: PublicEntityId,
    musteriId: number
  ): Promise<boolean> {
    //Istekler hard delete edilmez; silmeTarihi setlenerek listelerden dusurulur.
    const result = await this.prisma.client.istek.updateMany({
      where: {
        ...publicEntityWhere(id),
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
    //Musterinin aktif isteklerini yeni olusturulana gore sirali sekilde getirir.
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
    id: PublicEntityId,
    musteriId: number
  ): Promise<StoredTransportRequestRecord | null> {
    //Detay okuma da sahiplik ve soft delete filtresiyle yapilir.
    const transportRequest = await this.prisma.client.istek.findFirst({
      where: {
        ...publicEntityWhere(id),
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
    //Yeni gorseller mevcut listenin sonuna eklensin diye en buyuk sortOrder bulunur.
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
    //Gorsel dosyalari storage'a yazildiktan sonra DB tarafindaki IstekGorsel kayitlari
    //toplu olarak olusturulur.
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
    //Primary gorsel tekil kalsin diye yeni primary atamadan once aktif primary'ler temizlenir.
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
    imageId: EntityIdSelector,
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<boolean> {
    const db = this.getExecutor(executor);
    const result = await db.istekGorsel.updateMany({
      where: {
        ...this.toEntityWhere(imageId),
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
    imageId: EntityIdSelector,
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<StoredTransportRequestImageRecord | null> {
    const db = this.getExecutor(executor);
    const image = await db.istekGorsel.findFirst({
      where: {
        ...this.toEntityWhere(imageId),
        istekId: requestId,
        silmeTarihi: null,
      },
      select: transportRequestImageSelect,
    });

    return image ? this.mapStoredTransportRequestImage(image) : null;
  }

  async softDeleteImageByIdAndRequestId(
    imageId: EntityIdSelector,
    requestId: number,
    deletedAt: Date,
    executor?: PrismaExecutor
  ): Promise<boolean> {
    //Gorsel kaydi fiziksel olarak silinmez; silmeTarihi setlenir ve primary bayragi kaldirilir.
    const db = this.getExecutor(executor);
    const result = await db.istekGorsel.updateMany({
      where: {
        ...this.toEntityWhere(imageId),
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
    //Metotlar transaction icinden cagrildiginda tx kullanir, normal akista Prisma client'a duser.
    return executor ?? this.prisma.client;
  }

  private toEntityWhere(id: EntityIdSelector): { id: number } | { publicId: string } {
    return typeof id === "number" ? { id } : publicEntityWhere(id);
  }

  private buildIstekFlatWriteData(
    input: CreateTransportRequestRecordInput | UpdateTransportRequestRecordInput
  ) {
    const canonicalBaslangic =
      input.normalizeBaslangicSehir?.trim() || input.baslangicSehri.trim();
    const canonicalVaris =
      input.normalizeVarisSehir?.trim() || input.varisSehri.trim();

    return {
      baslangicSehri: canonicalBaslangic,
      varisSehri: canonicalVaris,
      baslangicKonumMetni: input.baslangicKonumMetni,
      varisKonumMetni: input.varisKonumMetni,
      baslangicProvider: input.baslangicProvider,
      varisProvider: input.varisProvider,
      baslangicPlaceId: input.baslangicPlaceId,
      varisPlaceId: input.varisPlaceId,
      normalizeBaslangicSehir: canonicalBaslangic,
      normalizeVarisSehir: canonicalVaris,
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
      tasimaTarihiGun: parseDateOnlyToDbDate(input.tasimaTarihi),
      yukDetay: input.yukDetay,
    };
  }

  private async syncKonumlarForIstek(
    istekId: number,
    input: CreateTransportRequestRecordInput | UpdateTransportRequestRecordInput
  ): Promise<void> {
    for (const konum of buildIstekKonumUpsertsFromFlatFields(input)) {
      await this.prisma.client.istekKonum.upsert({
        where: {
          istekId_yon: {
            istekId,
            yon: konum.yon,
          },
        },
        create: {
          istekId,
          yon: konum.yon,
          provider: konum.provider,
          placeId: konum.placeId,
          konumMetni: konum.konumMetni,
          sehir: konum.sehir,
          ilce: konum.ilce,
          enlem: konum.enlem,
          boylam: konum.boylam,
        },
        update: {
          provider: konum.provider,
          placeId: konum.placeId,
          konumMetni: konum.konumMetni,
          sehir: konum.sehir,
          ilce: konum.ilce,
          enlem: konum.enlem,
          boylam: konum.boylam,
        },
      });
    }
  }

  private mapStoredTransportRequest(
    transportRequest: StoredTransportRequestQuery
  ): StoredTransportRequestRecord {
    //Prisma'nin Decimal ve nested relation yapisini service'in kullanacagi sade
    //number/null ve nested record formatina cevirir.
    const images = transportRequest.gorseller.map((image) =>
      this.mapStoredTransportRequestImage(image)
    );
    const primaryImage = images.find((image) => image.isPrimary) ?? null;
    const locationFields = mergeIstekFlatFieldsWithKonumlar(
      {
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
      },
      transportRequest.konumlar
    );

    return {
      id: transportRequest.id,
      publicId: transportRequest.publicId,
      baslangicSehri: locationFields.baslangicSehri,
      varisSehri: locationFields.varisSehri,
      baslangicKonumMetni: locationFields.baslangicKonumMetni,
      varisKonumMetni: locationFields.varisKonumMetni,
      baslangicProvider: locationFields.baslangicProvider,
      varisProvider: locationFields.varisProvider,
      baslangicPlaceId: locationFields.baslangicPlaceId,
      varisPlaceId: locationFields.varisPlaceId,
      normalizeBaslangicSehir: locationFields.normalizeBaslangicSehir,
      normalizeVarisSehir: locationFields.normalizeVarisSehir,
      normalizeBaslangicIlce: locationFields.normalizeBaslangicIlce,
      normalizeVarisIlce: locationFields.normalizeVarisIlce,
      baslangicEnlem: locationFields.baslangicEnlem,
      baslangicBoylam: locationFields.baslangicBoylam,
      varisEnlem: locationFields.varisEnlem,
      varisBoylam: locationFields.varisBoylam,
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
            publicId: transportRequest.nakliye.publicId,
            carrierId: transportRequest.nakliye.nakliyeci.id,
            carrierPublicId: transportRequest.nakliye.nakliyeci.publicId,
            carrierName: `${transportRequest.nakliye.nakliyeci.ad} ${transportRequest.nakliye.nakliyeci.soyad}`.trim(),
            carrierUsername: transportRequest.nakliye.nakliyeci.kullaniciAdi,
            aracId: transportRequest.nakliye.arac.id,
            aracPublicId: transportRequest.nakliye.arac.publicId,
            aracPlaka: transportRequest.nakliye.arac.plaka,
            durumTuru: transportRequest.nakliye.durum.durumTuru,
            anlasilanFiyat: transportRequest.nakliye.anlasilanFiyat.toNumber(),
            durumAdi: transportRequest.nakliye.durum.durumAdi,
            olusturmaTarihi: transportRequest.nakliye.olusturmaTarihi,
            baslangicTarihi: transportRequest.nakliye.baslangicTarihi,
            teslimBildirimTarihi:
              transportRequest.nakliye.teslimBildirimTarihi,
            teslimTarihi: transportRequest.nakliye.teslimTarihi,
            planlananAlimTarihi:
              transportRequest.nakliye.planlananAlimTarihi,
            tahminiTeslimTarihi:
              transportRequest.nakliye.tahminiTeslimTarihi,
            ratings: transportRequest.nakliye.puanlar.map((rating) => ({
              id: rating.id,
              publicId: rating.publicId,
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
      publicId: image.publicId,
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
