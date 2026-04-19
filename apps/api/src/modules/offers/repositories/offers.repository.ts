import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const OPEN_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

const OPEN_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "OLUSTURULDU",
} as const;

export type OpenRequestListItemRecord = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  yukDetay: string;
  olusturmaTarihi: Date;
  durumAdi: string;
  alreadyOffered: boolean;
};

export type OpenRequestDetailRecord = OpenRequestListItemRecord & {
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  hasExistingOffer: boolean;
};

export type OfferCreateContextRecord = {
  id: number;
  musteriId: number;
  silmeTarihi: Date | null;
  durumTuru: string;
  durumAdi: string;
  hasNakliye: boolean;
};

export type ActiveVehicleRecord = {
  id: number;
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
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durumAdi: string;
};

export type IncomingOfferListItemRecord = {
  id: number;
  requestId: number;
  carrierId: number;
  carrierName: string;
  carrierUsername: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durumAdi: string;
};

export type OfferDecisionContextRecord = {
  offerId: number;
  requestId: number;
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
    }
  | {
      ok: false;
      reason: "shipment_exists" | "offer_not_open" | "request_not_open";
    };

class OfferAcceptanceStateError extends Error {
  constructor(
    readonly reason: "shipment_exists" | "offer_not_open" | "request_not_open"
  ) {
    super(reason);
  }
}

@Injectable()
export class OffersRepository {
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
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    });

    return status?.id ?? null;
  }

  async findOpenRequestsForCarrier(
    carrierId: number
  ): Promise<OpenRequestListItemRecord[]> {
    const requests = await this.prisma.client.istek.findMany({
      where: {
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
      orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
      select: {
        id: true,
        baslangicSehri: true,
        varisSehri: true,
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
      },
    });

    return requests.map((request) => ({
      id: request.id,
      baslangicSehri: request.baslangicSehri,
      varisSehri: request.varisSehri,
      yukDetay: request.yukDetay,
      olusturmaTarihi: request.olusturmaTarihi,
      durumAdi: request.durum.durumAdi,
      alreadyOffered: request.teklifler.length > 0,
    }));
  }

  async findOpenRequestByIdForCarrier(
    requestId: number,
    carrierId: number
  ): Promise<OpenRequestDetailRecord | null> {
    const request = await this.prisma.client.istek.findFirst({
      where: {
        id: requestId,
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
      },
    });

    if (!request) {
      return null;
    }

    return {
      id: request.id,
      baslangicSehri: request.baslangicSehri,
      varisSehri: request.varisSehri,
      baslangicEnlem: request.baslangicEnlem.toNumber(),
      baslangicBoylam: request.baslangicBoylam.toNumber(),
      varisEnlem: request.varisEnlem.toNumber(),
      varisBoylam: request.varisBoylam.toNumber(),
      yukDetay: request.yukDetay,
      olusturmaTarihi: request.olusturmaTarihi,
      durumAdi: request.durum.durumAdi,
      alreadyOffered: request.teklifler.length > 0,
      hasExistingOffer: request.teklifler.length > 0,
    };
  }

  async findOfferCreateContextByRequestId(
    requestId: number
  ): Promise<OfferCreateContextRecord | null> {
    const request = await this.prisma.client.istek.findFirst({
      where: {
        id: requestId,
      },
      select: {
        id: true,
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
      musteriId: request.musteriId,
      silmeTarihi: request.silmeTarihi,
      durumTuru: request.durum.durumTuru,
      durumAdi: request.durum.durumAdi,
      hasNakliye: Boolean(request.nakliye),
    };
  }

  async findActiveVehicleByIdAndOwnerId(
    aracId: number,
    ownerId: number
  ): Promise<ActiveVehicleRecord | null> {
    const vehicle = await this.prisma.client.arac.findFirst({
      where: {
        id: aracId,
        sahipId: ownerId,
        silmeTarihi: null,
      },
      select: {
        id: true,
        plaka: true,
      },
    });

    return vehicle ?? null;
  }

  async carrierHasActiveVehicle(carrierId: number): Promise<boolean> {
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

  async create(input: CreateOfferRecordInput): Promise<StoredOfferRecord> {
    const offer = await this.prisma.client.teklif.create({
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
        fiyat: true,
        not: true,
        istek: {
          select: {
            id: true,
            baslangicSehri: true,
            varisSehri: true,
          },
        },
        arac: {
          select: {
            id: true,
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
      requestId: offer.istek.id,
      baslangicSehri: offer.istek.baslangicSehri,
      varisSehri: offer.istek.varisSehri,
      aracId: offer.arac?.id ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    };
  }

  async findMyOffersByCarrierId(
    carrierId: number
  ): Promise<StoredOfferRecord[]> {
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
        fiyat: true,
        not: true,
        istek: {
          select: {
            id: true,
            baslangicSehri: true,
            varisSehri: true,
          },
        },
        arac: {
          select: {
            id: true,
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
      requestId: offer.istek.id,
      baslangicSehri: offer.istek.baslangicSehri,
      varisSehri: offer.istek.varisSehri,
      aracId: offer.arac?.id ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    }));
  }

  async findActiveRequestIdByCustomerId(
    requestId: number,
    customerId: number
  ): Promise<number | null> {
    const request = await this.prisma.client.istek.findFirst({
      where: {
        id: requestId,
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
        fiyat: true,
        not: true,
        istekId: true,
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
        durum: {
          select: {
            durumAdi: true,
          },
        },
      },
    });

    return offers.map((offer) => ({
      id: offer.id,
      requestId: offer.istekId,
      carrierId: offer.nakliyeci.id,
      carrierName: `${offer.nakliyeci.ad} ${offer.nakliyeci.soyad}`.trim(),
      carrierUsername: offer.nakliyeci.kullaniciAdi,
      aracId: offer.arac?.id ?? null,
      aracPlaka: offer.arac?.plaka ?? null,
      fiyat: offer.fiyat.toNumber(),
      not: offer.not,
      durumAdi: offer.durum.durumAdi,
    }));
  }

  async findOfferDecisionContextById(
    offerId: number
  ): Promise<OfferDecisionContextRecord | null> {
    const offer = await this.prisma.client.teklif.findFirst({
      where: {
        id: offerId,
      },
      select: {
        id: true,
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
      requestId: offer.istek.id,
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

  async rejectOpenOfferById(offerId: number, rejectedStatusId: number): Promise<boolean> {
    const result = await this.prisma.client.teklif.updateMany({
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

  async acceptOffer(input: AcceptOfferInput): Promise<AcceptOfferResult> {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const existingShipment = await tx.nakliye.findFirst({
          where: {
            istekId: input.requestId,
          },
          select: {
            id: true,
          },
        });

        if (existingShipment) {
          throw new OfferAcceptanceStateError("shipment_exists");
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
          throw new OfferAcceptanceStateError("offer_not_open");
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
          throw new OfferAcceptanceStateError("request_not_open");
        }

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
          },
        });

        return {
          ok: true,
          jobId: shipment.id,
        };
      });
    } catch (error) {
      if (error instanceof OfferAcceptanceStateError) {
        return {
          ok: false,
          reason: error.reason,
        };
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return {
          ok: false,
          reason: "shipment_exists",
        };
      }

      throw error;
    }
  }
}
