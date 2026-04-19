import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type { StoredSubmittedRatingRecord } from "../rating-context.helpers";

const shipmentRatingSelect = {
  id: true,
  puanlayanId: true,
  puanlananId: true,
  puanDegeri: true,
  yorum: true,
  tarih: true,
} satisfies Prisma.PuanlamaSelect;

const rateableJobSelect = {
  id: true,
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
    },
  },
  puanlar: {
    select: shipmentRatingSelect,
  },
} satisfies Prisma.NakliyeSelect;

const ratingListSelect = {
  id: true,
  puanDegeri: true,
  yorum: true,
  tarih: true,
  puanlayan: {
    select: {
      id: true,
      ad: true,
      soyad: true,
      kullaniciAdi: true,
    },
  },
  puanlanan: {
    select: {
      id: true,
      ad: true,
      soyad: true,
      kullaniciAdi: true,
    },
  },
  nakliye: {
    select: {
      id: true,
      nakliyeciId: true,
      istek: {
        select: {
          id: true,
          musteriId: true,
          baslangicSehri: true,
          varisSehri: true,
        },
      },
    },
  },
} satisfies Prisma.PuanlamaSelect;

type StoredRateableJobQuery = Prisma.NakliyeGetPayload<{
  select: typeof rateableJobSelect;
}>;

type StoredRatingListQuery = Prisma.PuanlamaGetPayload<{
  select: typeof ratingListSelect;
}>;

export type StoredRateableJobRecord = {
  id: number;
  requestId: number;
  carrierId: number;
  customerId: number;
  durumTuru: string;
  durumAdi: string;
  ratings: StoredSubmittedRatingRecord[];
};

export type CreateRatingRecordInput = {
  nakliyeId: number;
  puanlayanId: number;
  puanlananId: number;
  puanTanimId: number;
  puanDegeri: number;
  yorum?: string;
};

export type StoredRatingListRecord = {
  id: number;
  jobId: number;
  requestId: number;
  puanDegeri: number;
  yorum: string | null;
  tarih: Date;
  baslangicSehri: string;
  varisSehri: string;
  puanlayanId: number;
  puanlayanName: string;
  puanlayanUsername: string;
  puanlananId: number;
  puanlananName: string;
  puanlananUsername: string;
  rolBaglami: string;
};

export type StoredRatingSummaryBucket = {
  averageRating: number | null;
  ratingCount: number;
};

export type StoredRatingSummaryRecord = {
  asCarrier: StoredRatingSummaryBucket;
  asCustomer: StoredRatingSummaryBucket;
};

@Injectable()
export class RatingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRatingTypeIdByType(type: string): Promise<number | null> {
    const ratingType = await this.prisma.client.puanTanimlari.findFirst({
      where: {
        puanlamaTuru: {
          equals: type,
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

    return ratingType?.id ?? null;
  }

  async findRateableJobByIdAndParticipant(
    jobId: number,
    participantId: number
  ): Promise<StoredRateableJobRecord | null> {
    const job = await this.prisma.client.nakliye.findFirst({
      where: {
        id: jobId,
        OR: [
          {
            nakliyeciId: participantId,
          },
          {
            istek: {
              musteriId: participantId,
            },
          },
        ],
      },
      select: rateableJobSelect,
    });

    return job ? this.mapStoredRateableJob(job) : null;
  }

  async create(input: CreateRatingRecordInput): Promise<StoredSubmittedRatingRecord> {
    const rating = await this.prisma.client.puanlama.create({
      data: {
        nakliyeId: input.nakliyeId,
        puanlayanId: input.puanlayanId,
        puanlananId: input.puanlananId,
        puanTanimId: input.puanTanimId,
        puanDegeri: input.puanDegeri,
        yorum: input.yorum,
      },
      select: shipmentRatingSelect,
    });

    return this.mapStoredSubmittedRating(rating);
  }

  async findManyGivenByUserId(userId: number): Promise<StoredRatingListRecord[]> {
    const ratings = await this.prisma.client.puanlama.findMany({
      where: {
        puanlayanId: userId,
      },
      orderBy: [{ tarih: "desc" }, { id: "desc" }],
      select: ratingListSelect,
    });

    return ratings.map((rating) => this.mapStoredRatingListRecord(rating));
  }

  async findManyReceivedByUserId(userId: number): Promise<StoredRatingListRecord[]> {
    const ratings = await this.prisma.client.puanlama.findMany({
      where: {
        puanlananId: userId,
      },
      orderBy: [{ tarih: "desc" }, { id: "desc" }],
      select: ratingListSelect,
    });

    return ratings.map((rating) => this.mapStoredRatingListRecord(rating));
  }

  async getReceivedSummaryByUserId(userId: number): Promise<StoredRatingSummaryRecord> {
    const [asCarrier, asCustomer] = await Promise.all([
      this.prisma.client.puanlama.aggregate({
        where: {
          puanlananId: userId,
          nakliye: {
            nakliyeciId: userId,
          },
        },
        _avg: {
          puanDegeri: true,
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.client.puanlama.aggregate({
        where: {
          puanlananId: userId,
          nakliye: {
            istek: {
              musteriId: userId,
            },
          },
        },
        _avg: {
          puanDegeri: true,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      asCarrier: this.mapSummaryBucket(asCarrier),
      asCustomer: this.mapSummaryBucket(asCustomer),
    };
  }

  private mapStoredRateableJob(
    job: StoredRateableJobQuery
  ): StoredRateableJobRecord {
    return {
      id: job.id,
      requestId: job.istek.id,
      carrierId: job.nakliyeciId,
      customerId: job.istek.musteriId,
      durumTuru: job.durum.durumTuru,
      durumAdi: job.durum.durumAdi,
      ratings: job.puanlar.map((rating) => this.mapStoredSubmittedRating(rating)),
    };
  }

  private mapStoredSubmittedRating(
    rating: Prisma.PuanlamaGetPayload<{ select: typeof shipmentRatingSelect }>
  ): StoredSubmittedRatingRecord {
    return {
      id: rating.id,
      puanlayanId: rating.puanlayanId,
      puanlananId: rating.puanlananId,
      puanDegeri: rating.puanDegeri,
      yorum: rating.yorum,
      tarih: rating.tarih,
    };
  }

  private mapStoredRatingListRecord(
    rating: StoredRatingListQuery
  ): StoredRatingListRecord {
    return {
      id: rating.id,
      jobId: rating.nakliye.id,
      requestId: rating.nakliye.istek.id,
      puanDegeri: rating.puanDegeri,
      yorum: rating.yorum,
      tarih: rating.tarih,
      baslangicSehri: rating.nakliye.istek.baslangicSehri,
      varisSehri: rating.nakliye.istek.varisSehri,
      puanlayanId: rating.puanlayan.id,
      puanlayanName: `${rating.puanlayan.ad} ${rating.puanlayan.soyad}`.trim(),
      puanlayanUsername: rating.puanlayan.kullaniciAdi,
      puanlananId: rating.puanlanan.id,
      puanlananName: `${rating.puanlanan.ad} ${rating.puanlanan.soyad}`.trim(),
      puanlananUsername: rating.puanlanan.kullaniciAdi,
      rolBaglami:
        rating.nakliye.nakliyeciId === rating.puanlanan.id ? "NAKLIYECI" : "MUSTERI",
    };
  }

  private mapSummaryBucket(aggregate: {
    _avg: {
      puanDegeri: number | null;
    };
    _count: {
      _all: number;
    };
  }): StoredRatingSummaryBucket {
    return {
      averageRating:
        typeof aggregate._avg.puanDegeri === "number"
          ? Number(aggregate._avg.puanDegeri.toFixed(2))
          : null,
      ratingCount: aggregate._count._all,
    };
  }
}
