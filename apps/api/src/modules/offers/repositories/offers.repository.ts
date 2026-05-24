import { Prisma, PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const OPEN_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

const OPEN_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "OLUSTURULDU",
} as const;

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

//Acik istek kartlarinda gosterilecek primary gorsel ozetini temsil eder.
export type OpenRequestImageRecord = {
  id: number;
  publicId: string;
  storageKey: string;
  thumbnailStorageKey: string;
  width: number;
  height: number;
  isPrimary: boolean;
};

export type OpenRequestListItemRecord = {
  id: number;
  publicId: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicProvider: string | null;
  varisProvider: string | null;
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
  durumAdi: string;
  alreadyOffered: boolean;
  primaryImage: OpenRequestImageRecord | null;
  imageCount: number;
};

export type OpenRequestDetailRecord = OpenRequestListItemRecord & {
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
  hasExistingOffer: boolean;
  images: OpenRequestImageRecord[];
  primaryImageId: string | null;
};

export type OpenRequestFilters = {
  baslangicSehir?: string;
  varisSehir?: string;
  tekTasimaIstiyor?: boolean;
  minAgirlikKg?: number;
  maxAgirlikKg?: number;
  minHacimM3?: number;
  maxHacimM3?: number;
  yukTipi?: string;
  tasimaTarihi?: string;
};

export type OfferCreateContextRecord = {
  id: number;
  publicId: string;
  musteriId: number;
  silmeTarihi: Date | null;
  durumTuru: string;
  durumAdi: string;
  hasNakliye: boolean;
};

export type ActiveVehicleRecord = {
  id: number;
  publicId: string;
  plaka: string;
};

export type CreateOfferRecordInput = {
  istekId: number;
  nakliyeciId: number;
  aracId: number;
  fiyat: number;
  not: string | null;
  durumId: number;
};

export type StoredOfferRecord = {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
  baslangicSehri: string;
  varisSehri: string;
  aracId: number | null;
  aracPublicId: string | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durumAdi: string;
};

export type IncomingOfferListItemRecord = {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
  carrierId: number;
  carrierPublicId: string;
  carrierName: string;
  carrierUsername: string;
  carrierProfileImageStorageKey: string | null;
  aracId: number | null;
  aracPublicId: string | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durumAdi: string;
};

export type MyIncomingOfferListItemRecord = {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  carrierId: number;
  carrierPublicId: string;
  carrierName: string;
  carrierUsername: string;
  carrierProfileImageStorageKey: string | null;
  aracId: number | null;
  aracPublicId: string | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durumAdi: string;
};

export type OfferDecisionContextRecord = {
  offerId: number;
  offerPublicId: string;
  requestId: number;
  requestPublicId: string;
  customerId: number;
  carrierId: number;
  offerStatusTuru: string;
  offerStatusAdi: string;
  requestStatusTuru: string;
  requestStatusAdi: string;
  requestDeletedAt: Date | null;
  hasShipment: boolean;
  aracId: number | null;
  aracPlaka: string | null;
  aracDeletedAt: Date | null;
  aracOwnerId: number | null;
  fiyat: number;
};

export type AcceptOfferInput = {
  offerId: number;
  requestId: number;
  openOfferStatusId: number;
  acceptedOfferStatusId: number;
  rejectedOfferStatusId: number;
  openRequestStatusId: number;
  agreedRequestStatusId: number;
  initialShipmentStatusId: number;
  carrierId: number;
  aracId: number;
  fiyat: number;
};

export type AcceptOfferResult =
  | {
      ok: true;
      jobId: number;
      jobPublicId: string;
      reservationSnapshot: {
        vehicleId: number;
        shipmentId: number;
        requestId: number;
        offerId: number;
        reservedAgirlikKg: number | null;
        reservedHacimM3: number | null;
        isDedicated: boolean;
      };
      rejectedSiblingOffers: Array<{
        offerId: number;
        offerPublicId: string;
        carrierId: number;
      }>;
    }
  | {
      ok: false;
      reason: "shipment_exists" | "offer_not_open" | "request_not_open";
    };

@Injectable()
export class OffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  //Teklif, istek ve nakliye lifecycle durumlari icin gerekli durum id'sini bulur.
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
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    });

    return status?.id ?? null;
  }

  // Repository tarafinda yalnizca temel discovery havuzu cekilir; rota sapma
  // filtresi burada degil evaluator ile servis katmaninda uygulanir.
  async findOpenRequestsForCarrier(
    carrierId: number,
    filters: OpenRequestFilters
  ): Promise<OpenRequestListItemRecord[]> {
    const requests = await this.prisma.client.istek.findMany({
      where: this.buildOpenRequestsWhere(carrierId, filters),
      orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
      select: {
        id: true,
        publicId: true,
        baslangicSehri: true,
        varisSehri: true,
        baslangicKonumMetni: true,
        varisKonumMetni: true,
        baslangicProvider: true,
        varisProvider: true,
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
            durumAdi: true,
          },
        },
        teklifler: {
          where: {
            nakliyeciId: carrierId,
            durum: {
              durumTuru: {
                equals: OPEN_OFFER_STATUS.durumTuru,
                mode: Prisma.QueryMode.insensitive,
              },
              durumAdi: {
                equals: OPEN_OFFER_STATUS.durumAdi,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
        gorseller: {
          where: {
            silmeTarihi: null,
          },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            publicId: true,
            storageKey: true,
            thumbnailStorageKey: true,
            width: true,
            height: true,
            isPrimary: true,
          },
        },
      },
    });

    return requests.map((request) => ({
      primaryImage: request.gorseller[0]
        ? {
            id: request.gorseller[0].id,
            publicId: request.gorseller[0].publicId,
            storageKey: request.gorseller[0].storageKey,
            thumbnailStorageKey: request.gorseller[0].thumbnailStorageKey,
            width: request.gorseller[0].width,
            height: request.gorseller[0].height,
            isPrimary: request.gorseller[0].isPrimary,
          }
        : null,
      imageCount: request.gorseller.length,
      id: request.id,
      publicId: request.publicId,
      baslangicSehri: request.baslangicSehri,
      varisSehri: request.varisSehri,
      baslangicKonumMetni: request.baslangicKonumMetni,
      varisKonumMetni: request.varisKonumMetni,
      baslangicProvider: request.baslangicProvider,
      varisProvider: request.varisProvider,
      baslangicEnlem: request.baslangicEnlem.toNumber(),
      baslangicBoylam: request.baslangicBoylam.toNumber(),
      varisEnlem: request.varisEnlem.toNumber(),
      varisBoylam: request.varisBoylam.toNumber(),
      rotaMesafeMetre: request.rotaMesafeMetre,
      rotaSureSaniye: request.rotaSureSaniye,
      tekTasimaIstiyor: request.tekTasimaIstiyor,
      agirlikKg: request.agirlikKg?.toNumber() ?? null,
      hacimM3: request.hacimM3?.toNumber() ?? null,
      yukTipi: request.yukTipi,
      tasimaTarihi: request.tasimaTarihi,
      yukDetay: request.yukDetay,
      olusturmaTarihi: request.olusturmaTarihi,
      durumAdi: request.durum.durumAdi,
      alreadyOffered: request.teklifler.length > 0,
    }));
  }

  // Detail ekraninin route filtresi uygulayabilmesi icin request'in canonical
  // koordinatlari ve ana route metrikleri bu seviyede eksiksiz okunur.
  async findOpenRequestByIdForCarrier(
    requestId: PublicEntityId,
    carrierId: number
  ): Promise<OpenRequestDetailRecord | null> {
    const request = await this.prisma.client.istek.findFirst({
      where: {
        ...publicEntityWhere(requestId),
        silmeTarihi: null,
        musteriId: {
          not: carrierId,
        },
        nakliye: {
          is: null,
        },
        durum: {
          durumTuru: {
            equals: OPEN_REQUEST_STATUS.durumTuru,
            mode: Prisma.QueryMode.insensitive,
          },
          durumAdi: {
            equals: OPEN_REQUEST_STATUS.durumAdi,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      },
      select: {
        id: true,
        publicId: true,
        baslangicSehri: true,
        varisSehri: true,
        baslangicKonumMetni: true,
        varisKonumMetni: true,
        rotaMesafeMetre: true,    //yeni
        rotaSureSaniye: true,     //yeni
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
            durumAdi: true,
          },
        },
        teklifler: {
          where: {
            nakliyeciId: carrierId,
            durum: {
              durumTuru: {
                equals: OPEN_OFFER_STATUS.durumTuru,
                mode: Prisma.QueryMode.insensitive,
              },
              durumAdi: {
                equals: OPEN_OFFER_STATUS.durumAdi,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
        gorseller: {
          where: {
            silmeTarihi: null,
          },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            publicId: true,
            storageKey: true,
            thumbnailStorageKey: true,
            width: true,
            height: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!request) {
      return null;
    }

    return {
      primaryImage: request.gorseller[0]
        ? {
            id: request.gorseller[0].id,
            publicId: request.gorseller[0].publicId,
            storageKey: request.gorseller[0].storageKey,
            thumbnailStorageKey: request.gorseller[0].thumbnailStorageKey,
            width: request.gorseller[0].width,
            height: request.gorseller[0].height,
            isPrimary: request.gorseller[0].isPrimary,
          }
        : null,
      imageCount: request.gorseller.length,
      id: request.id,
      publicId: request.publicId,
      baslangicSehri: request.baslangicSehri,
      varisSehri: request.varisSehri,
      baslangicKonumMetni: request.baslangicKonumMetni,
      varisKonumMetni: request.varisKonumMetni,
      rotaMesafeMetre: request.rotaMesafeMetre,
      rotaSureSaniye: request.rotaSureSaniye,
      baslangicProvider: request.baslangicProvider,
      varisProvider: request.varisProvider,
      baslangicPlaceId: request.baslangicPlaceId,
      varisPlaceId: request.varisPlaceId,
      normalizeBaslangicSehir: request.normalizeBaslangicSehir,
      normalizeVarisSehir: request.normalizeVarisSehir,
      normalizeBaslangicIlce: request.normalizeBaslangicIlce,
      normalizeVarisIlce: request.normalizeVarisIlce,
      baslangicEnlem: request.baslangicEnlem.toNumber(),
      baslangicBoylam: request.baslangicBoylam.toNumber(),
      varisEnlem: request.varisEnlem.toNumber(),
      varisBoylam: request.varisBoylam.toNumber(),
      tekTasimaIstiyor: request.tekTasimaIstiyor,
      agirlikKg: request.agirlikKg?.toNumber() ?? null,
      hacimM3: request.hacimM3?.toNumber() ?? null,
      yukTipi: request.yukTipi,
      tasimaTarihi: request.tasimaTarihi,
      yukDetay: request.yukDetay,
      olusturmaTarihi: request.olusturmaTarihi,
      durumAdi: request.durum.durumAdi,
      alreadyOffered: request.teklifler.length > 0,
      hasExistingOffer: request.teklifler.length > 0,
      images: request.gorseller.map((image) => ({
        id: image.id,
        publicId: image.publicId,
        storageKey: image.storageKey,
        thumbnailStorageKey: image.thumbnailStorageKey,
        width: image.width,
        height: image.height,
        isPrimary: image.isPrimary,
      })),
      primaryImageId:
        request.gorseller.find((image) => image.isPrimary)?.publicId ??
        request.gorseller[0]?.publicId ??
        null,
    };
  }

  async findOfferCreateContextByRequestId(
    requestId: PublicEntityId
  ): Promise<OfferCreateContextRecord | null> {
    //Teklif olusturmadan once istegin sahibi, silinme durumu, aktif durumu ve
    //nakliyeye donusup donusmedigi tek snapshot olarak okunur.
    const request = await this.prisma.client.istek.findFirst({
      where: {
        ...publicEntityWhere(requestId),
      },
      select: {
        id: true,
        publicId: true,
        musteriId: true,
        silmeTarihi: true,
        durum: {
          select: {
            durumTuru: true,
            durumAdi: true,
          },
        },
        nakliye: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!request) {
      return null;
    }

    return {
      id: request.id,
      publicId: request.publicId,
      musteriId: request.musteriId,
      silmeTarihi: request.silmeTarihi,
      durumTuru: request.durum.durumTuru,
      durumAdi: request.durum.durumAdi,
      hasNakliye: Boolean(request.nakliye),
    };
  }

  async findActiveVehicleByIdAndOwnerId(
    aracId: PublicEntityId,
    ownerId: number
  ): Promise<ActiveVehicleRecord | null> {
    //Nakliyeci sadece kendi aktif araciyla teklif verebilir.
    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        ...publicEntityWhere(aracId),
        sahipId: ownerId,
        silmeTarihi: null,
      },
      select: {
        id: true,
        publicId: true,
        plaka: true,
      },
    });

    return vehicle ?? null;
  }

  async carrierHasActiveVehicle(carrierId: number): Promise<boolean> {
    //Acik istek detayinda "teklif verebilir mi" bilgisini beslemek icin kullanilir.
    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        sahipId: carrierId,
        silmeTarihi: null,
      },
      select: {
        id: true,
      },
    });

    return Boolean(vehicle);
  }

  async carrierHasExistingOfferForRequest(
    carrierId: number,
    requestId: number
  ): Promise<boolean> {
    //Ayni nakliyecinin ayni acik istege ikinci bir acik teklif vermesini engellemek icin kullanilir.
    const offer = await this.prisma.client.teklif.findFirst({
      where: {
        nakliyeciId: carrierId,
        istekId: requestId,
        durum: {
          durumTuru: {
            equals: OPEN_OFFER_STATUS.durumTuru,
            mode: Prisma.QueryMode.insensitive,
          },
          durumAdi: {
            equals: OPEN_OFFER_STATUS.durumAdi,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(offer);
  }

  async create(
    input: CreateOfferRecordInput,
    executor?: PrismaExecutor
  ): Promise<StoredOfferRecord> {
    //Teklif kaydini olusturur ve service'in response'a cevirecegi sade offer bilgisini doner.
    const db = this.getExecutor(executor);
    const offer = await db.teklif.create({
      data: {
        istekId: input.istekId,
        nakliyeciId: input.nakliyeciId,
        aracId: input.aracId,
        fiyat: new Prisma.Decimal(input.fiyat),
        not: input.not,
        durumId: input.durumId,
      },
      select: {
        id: true,
        publicId: true,
        fiyat: true,
        not: true,
        istek: {
          select: {
            id: true,
            publicId: true,
            baslangicSehri: true,
            varisSehri: true,
          },
        },
        arac: {
          select: {
            id: true,
            publicId: true,
            plaka: true,
          },
        },
        durum: {
          select: {
            durumAdi: true,
          },
        },
      },
    });

    return {
      id: offer.id,
      publicId: offer.publicId,
      requestId: offer.istek.id,
      requestPublicId: offer.istek.publicId,
      baslangicSehri: offer.istek.baslangicSehri,
      varisSehri: offer.istek.varisSehri,
      aracId: offer.arac?.id ?? null,
      aracPublicId: offer.arac?.publicId ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    };
  }

  async findMyOffersByCarrierId(
    carrierId: number
  ): Promise<StoredOfferRecord[]> {
    //Nakliyecinin kendi tekliflerini istek ve arac ozetleriyle birlikte getirir.
    const offers = await this.prisma.client.teklif.findMany({
      where: {
        nakliyeciId: carrierId,
        istek: {
          silmeTarihi: null,
        },
      },
      orderBy: [{ id: "desc" }],
      select: {
        id: true,
        publicId: true,
        fiyat: true,
        not: true,
        istek: {
          select: {
            id: true,
            publicId: true,
            baslangicSehri: true,
            varisSehri: true,
          },
        },
        arac: {
          select: {
            id: true,
            publicId: true,
            plaka: true,
          },
        },
        durum: {
          select: {
            durumAdi: true,
          },
        },
      },
    });

    return offers.map((offer) => ({
      id: offer.id,
      publicId: offer.publicId,
      requestId: offer.istek.id,
      requestPublicId: offer.istek.publicId,
      baslangicSehri: offer.istek.baslangicSehri,
      varisSehri: offer.istek.varisSehri,
      aracId: offer.arac?.id ?? null,
      aracPublicId: offer.arac?.publicId ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    }));
  }

  async findActiveRequestIdByCustomerId(
    requestId: PublicEntityId,
    customerId: number
  ): Promise<number | null> {
    //Musterinin belirli istege sahip olup olmadigini hafif bir id sorgusuyla kontrol eder.
    const request = await this.prisma.client.istek.findFirst({
      where: {
        ...publicEntityWhere(requestId),
        musteriId: customerId,
        silmeTarihi: null,
      },
      select: {
        id: true,
      },
    });

    return request?.id ?? null;
  }

  async findIncomingOffersByRequestId(
    requestId: number
  ): Promise<IncomingOfferListItemRecord[]> {
    //Bir istege gelen teklifleri, nakliyeci ve arac bilgileriyle birlikte listeler.
    const offers = await this.prisma.client.teklif.findMany({
      where: {
        istekId: requestId,
        istek: {
          silmeTarihi: null,
        },
      },
      orderBy: [{ id: "desc" }],
      select: {
        id: true,
        publicId: true,
        fiyat: true,
        not: true,
        istekId: true,
        istek: {
          select: {
            publicId: true,
          },
        },
        nakliyeci: {
          select: {
            id: true,
            publicId: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        arac: {
          select: {
            id: true,
            publicId: true,
            plaka: true,
          },
        },
        durum: {
          select: {
            durumAdi: true,
          },
        },
      },
    });

    return offers.map((offer) => ({
      id: offer.id,
      publicId: offer.publicId,
      requestId: offer.istekId,
      requestPublicId: offer.istek.publicId,
      carrierId: offer.nakliyeci.id,
      carrierPublicId: offer.nakliyeci.publicId,
      carrierName: `${offer.nakliyeci.ad} ${offer.nakliyeci.soyad}`.trim(),
      carrierUsername: offer.nakliyeci.kullaniciAdi,
      carrierProfileImageStorageKey: offer.nakliyeci.profilFotografiStorageKey,
      aracId: offer.arac?.id ?? null,
      aracPublicId: offer.arac?.publicId ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    }));
  }

  async findMyIncomingOffersByCustomerId(
    customerId: number
  ): Promise<MyIncomingOfferListItemRecord[]> {
    //Musterinin tum acik isteklerine gelen, halen karar verilebilir durumdaki teklifleri toplar.
    const offers = await this.prisma.client.teklif.findMany({
      where: {
        durum: {
          durumTuru: {
            equals: OPEN_OFFER_STATUS.durumTuru,
            mode: Prisma.QueryMode.insensitive,
          },
          durumAdi: {
            equals: OPEN_OFFER_STATUS.durumAdi,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        istek: {
          musteriId: customerId,
          silmeTarihi: null,
          nakliye: {
            is: null,
          },
          durum: {
            durumTuru: {
              equals: OPEN_REQUEST_STATUS.durumTuru,
              mode: Prisma.QueryMode.insensitive,
            },
            durumAdi: {
              equals: OPEN_REQUEST_STATUS.durumAdi,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      },
      orderBy: [{ id: "desc" }],
      select: {
        id: true,
        publicId: true,
        fiyat: true,
        not: true,
        istekId: true,
        istek: {
          select: {
            publicId: true,
            baslangicSehri: true,
            varisSehri: true,
            baslangicKonumMetni: true,
            varisKonumMetni: true,
            tekTasimaIstiyor: true,
            agirlikKg: true,
            hacimM3: true,
            yukTipi: true,
            tasimaTarihi: true,
          },
        },
        nakliyeci: {
          select: {
            id: true,
            publicId: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        arac: {
          select: {
            id: true,
            publicId: true,
            plaka: true,
          },
        },
        durum: {
          select: {
            durumAdi: true,
          },
        },
      },
    });

    return offers.map((offer) => ({
      id: offer.id,
      publicId: offer.publicId,
      requestId: offer.istekId,
      requestPublicId: offer.istek.publicId,
      baslangicSehri: offer.istek.baslangicSehri,
      varisSehri: offer.istek.varisSehri,
      baslangicKonumMetni: offer.istek.baslangicKonumMetni,
      varisKonumMetni: offer.istek.varisKonumMetni,
      tekTasimaIstiyor: offer.istek.tekTasimaIstiyor,
      agirlikKg: offer.istek.agirlikKg?.toNumber() ?? null,
      hacimM3: offer.istek.hacimM3?.toNumber() ?? null,
      yukTipi: offer.istek.yukTipi,
      tasimaTarihi: offer.istek.tasimaTarihi,
      carrierId: offer.nakliyeci.id,
      carrierPublicId: offer.nakliyeci.publicId,
      carrierName: `${offer.nakliyeci.ad} ${offer.nakliyeci.soyad}`.trim(),
      carrierUsername: offer.nakliyeci.kullaniciAdi,
      carrierProfileImageStorageKey: offer.nakliyeci.profilFotografiStorageKey,
      aracId: offer.arac?.id ?? null,
      aracPublicId: offer.arac?.publicId ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    }));
  }

  async findOfferDecisionContextById(
    offerId: PublicEntityId
  ): Promise<OfferDecisionContextRecord | null> {
    //Kabul/red kararinda gereken offer, request ve arac durumlarini tek DB okumasinda toplar.
    const offer = await this.prisma.client.teklif.findFirst({
      where: {
        ...publicEntityWhere(offerId),
      },
      select: {
        id: true,
        publicId: true,
        fiyat: true,
        nakliyeciId: true,
        durum: {
          select: {
            durumTuru: true,
            durumAdi: true,
          },
        },
        istek: {
          select: {
            id: true,
            publicId: true,
            musteriId: true,
            silmeTarihi: true,
            durum: {
              select: {
                durumTuru: true,
                durumAdi: true,
              },
            },
            nakliye: {
              select: {
                id: true,
              },
            },
          },
        },
        arac: {
          select: {
            id: true,
            plaka: true,
            silmeTarihi: true,
            sahipId: true,
          },
        },
      },
    });

    if (!offer) {
      return null;
    }

    return {
      offerId: offer.id,
      offerPublicId: offer.publicId,
      requestId: offer.istek.id,
      requestPublicId: offer.istek.publicId,
      customerId: offer.istek.musteriId,
      carrierId: offer.nakliyeciId,
      offerStatusTuru: offer.durum.durumTuru,
      offerStatusAdi: offer.durum.durumAdi,
      requestStatusTuru: offer.istek.durum.durumTuru,
      requestStatusAdi: offer.istek.durum.durumAdi,
      requestDeletedAt: offer.istek.silmeTarihi,
      hasShipment: Boolean(offer.istek.nakliye),
      aracId: offer.arac?.id ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      aracDeletedAt: offer.arac?.silmeTarihi ?? null,
      aracOwnerId: offer.arac?.sahipId ?? null,
      fiyat: offer.fiyat.toNumber(),
    };
  }

  async rejectOpenOfferById(
    offerId: number,
    rejectedStatusId: number,
    executor?: PrismaExecutor
  ): Promise<boolean> {
    //Sadece halen acik olan teklif reddedilebilir; updateMany bu kosulu atomik kontrol eder.
    const db = this.getExecutor(executor);
    const result = await db.teklif.updateMany({
      where: {
        id: offerId,
        durum: {
          durumTuru: {
            equals: OPEN_OFFER_STATUS.durumTuru,
            mode: Prisma.QueryMode.insensitive,
          },
          durumAdi: {
            equals: OPEN_OFFER_STATUS.durumAdi,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      },
      data: {
        durumId: rejectedStatusId,
      },
    });

    return result.count > 0;
  }

  async acceptOfferInTransaction(
    tx: Prisma.TransactionClient,
    input: AcceptOfferInput
  ): Promise<AcceptOfferResult> {
    //Teklif kabulunun butun kritik DB adimlari burada ayni transaction icinde yapilir:
    //kazanan teklif kabul edilir, request anlasildi olur, rakip teklifler reddedilir ve nakliye acilir.
    const requestSnapshot = await tx.istek.findFirst({
      where: {
        id: input.requestId,
      },
      select: {
        agirlikKg: true,
        hacimM3: true,
        tekTasimaIstiyor: true,
      },
    });

    const existingShipment = await tx.nakliye.findFirst({
      where: {
        istekId: input.requestId,
      },
      select: {
        id: true,
      },
    });

    if (existingShipment) {
      return {
        ok: false,
        reason: "shipment_exists",
      };
    }

    const acceptedOfferResult = await tx.teklif.updateMany({
      where: {
        id: input.offerId,
        durumId: input.openOfferStatusId,
      },
      data: {
        durumId: input.acceptedOfferStatusId,
      },
    });

    if (acceptedOfferResult.count === 0) {
      return {
        ok: false,
        reason: "offer_not_open",
      };
    }

    const requestResult = await tx.istek.updateMany({
      where: {
        id: input.requestId,
        silmeTarihi: null,
        durumId: input.openRequestStatusId,
      },
      data: {
        durumId: input.agreedRequestStatusId,
      },
    });

    if (requestResult.count === 0) {
      return {
        ok: false,
        reason: "request_not_open",
      };
    }

    const rejectedSiblingOffers = await tx.teklif.findMany({
      where: {
        istekId: input.requestId,
        id: {
          not: input.offerId,
        },
        durumId: input.openOfferStatusId,
      },
      select: {
        id: true,
        publicId: true,
        nakliyeciId: true,
      },
    });

    await tx.teklif.updateMany({
      where: {
        istekId: input.requestId,
        id: {
          not: input.offerId,
        },
        durumId: input.openOfferStatusId,
      },
      data: {
        durumId: input.rejectedOfferStatusId,
      },
    });

    const shipment = await tx.nakliye.create({
      data: {
        istekId: input.requestId,
        nakliyeciId: input.carrierId,
        aracId: input.aracId,
        anlasilanFiyat: new Prisma.Decimal(input.fiyat),
        durumId: input.initialShipmentStatusId,
      },
      select: {
        id: true,
        publicId: true,
      },
    });

    return {
      ok: true,
      jobId: shipment.id,
      jobPublicId: shipment.publicId,
      reservationSnapshot: {
        vehicleId: input.aracId,
        shipmentId: shipment.id,
        requestId: input.requestId,
        offerId: input.offerId,
        reservedAgirlikKg: requestSnapshot?.agirlikKg?.toNumber() ?? null,
        reservedHacimM3: requestSnapshot?.hacimM3?.toNumber() ?? null,
        isDedicated: requestSnapshot?.tekTasimaIstiyor ?? false,
      },
      rejectedSiblingOffers: rejectedSiblingOffers.map((offer) => ({
        offerId: offer.id,
        offerPublicId: offer.publicId,
        carrierId: offer.nakliyeciId,
      })),
    };
  }

  private getExecutor(executor?: PrismaExecutor): PrismaExecutor {
    //Repository metotlari transaction icinden cagrilirsa tx, normal akista Prisma client kullanir.
    return executor ?? this.prisma.client;
  }


  //filtreleme kriterlerine göre açık istekler için where koşulu oluşturur
  private buildOpenRequestsWhere(
    carrierId: number,
    filters: OpenRequestFilters
  ): Prisma.IstekWhereInput {
    // Bu fonksiyon sadece temel discovery havuzu icin SQL where nesnesi uretir.
    // Route sapma filtresi burada degil, evaluator tarafinda gercek rota ile uygulanir.
    const andFilters: Prisma.IstekWhereInput[] = [];
    // Bu blok acik istek havuzunun degismeyen temel kosullarini tanimlar:
    // silinmemis, baska bir musterinin, nakliyeye donusmemis ve hala acik durumda istekler.
    const where: Prisma.IstekWhereInput = {
      silmeTarihi: null,
      musteriId: {
        not: carrierId,
      },
      nakliye: {
        is: null,
      },
      durum: {
        durumTuru: {
          equals: OPEN_REQUEST_STATUS.durumTuru,
          mode: Prisma.QueryMode.insensitive,
        },
        durumAdi: {
          equals: OPEN_REQUEST_STATUS.durumAdi,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    };

    // Sehir filtreleri normalized alanlarla desteklenir; boylece kullanici farkli
    // yazimlarla ayni ili secse bile SQL seviyesi daha tutarli calisir.
    if (filters.baslangicSehir) {
      andFilters.push({
        OR: [
          {
            normalizeBaslangicSehir: {
              equals: filters.baslangicSehir,
            },
          },
          {
            baslangicSehri: {
              equals: filters.baslangicSehir,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      });
    }

    if (filters.varisSehir) {
      andFilters.push({
        OR: [
          {
            normalizeVarisSehir: {
              equals: filters.varisSehir,
            },
          },
          {
            varisSehri: {
              equals: filters.varisSehir,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      });
    }

    if (typeof filters.tekTasimaIstiyor === "boolean") {
      where.tekTasimaIstiyor = filters.tekTasimaIstiyor;
    }

    // Agirlik ve hacim filtreleri route mantigindan bagimsizdir; sadece temel
    // discovery havuzunu daraltmak icin SQL araligi olarak uygulanir.
    if (typeof filters.minAgirlikKg === "number" || typeof filters.maxAgirlikKg === "number") {
      where.agirlikKg = {
        ...(typeof filters.minAgirlikKg === "number"
          ? { gte: new Prisma.Decimal(filters.minAgirlikKg) }
          : {}),
        ...(typeof filters.maxAgirlikKg === "number"
          ? { lte: new Prisma.Decimal(filters.maxAgirlikKg) }
          : {}),
      };
    }

    if (typeof filters.minHacimM3 === "number" || typeof filters.maxHacimM3 === "number") {
      where.hacimM3 = {
        ...(typeof filters.minHacimM3 === "number"
          ? { gte: new Prisma.Decimal(filters.minHacimM3) }
          : {}),
        ...(typeof filters.maxHacimM3 === "number"
          ? { lte: new Prisma.Decimal(filters.maxHacimM3) }
          : {}),
      };
    }

    if (filters.yukTipi) {
      where.yukTipi = filters.yukTipi;
    }

    if (filters.tasimaTarihi) {
      where.tasimaTarihi = filters.tasimaTarihi;
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return where;
  }
}
