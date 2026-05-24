import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type { StoredSubmittedRatingRecord } from "../rating-context.helpers";

const shipmentRatingSelect = {
  id: true,
  publicId: true,
  puanlayanId: true,
  puanlananId: true,
  puanDegeri: true,
  yorum: true,
  tarih: true,
} satisfies Prisma.PuanlamaSelect;

//Puanlanabilir nakliye sorgusunda katilimci bilgisi, durum ve daha once verilmis
//puanlar birlikte okunur.
const rateableJobSelect = {
  id: true,
  publicId: true,
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
    },
  },
  puanlar: {
    select: shipmentRatingSelect,
  },
} satisfies Prisma.NakliyeSelect;

const ratingListSelect = {
  id: true,
  publicId: true,
  puanDegeri: true,
  yorum: true,
  tarih: true,
  puanlayan: {
    select: {
      id: true,
      publicId: true,
      ad: true,
      soyad: true,
      kullaniciAdi: true,
    },
  },
  puanlanan: {
    select: {
      id: true,
      publicId: true,
      ad: true,
      soyad: true,
      kullaniciAdi: true,
    },
  },
  nakliye: {
    select: {
      id: true,
      publicId: true,
      nakliyeciId: true,
      istek: {
        select: {
          id: true,
          publicId: true,
          musteriId: true,
          baslangicSehri: true,
          varisSehri: true,
        },
      },
    },
  },
} satisfies Prisma.PuanlamaSelect;

//Prisma payload tipleri, mapper metodlarinda alan guvenligi saglamak icin kullanilir.
type StoredRateableJobQuery = Prisma.NakliyeGetPayload<{
  select: typeof rateableJobSelect;
}>;

type StoredRatingListQuery = Prisma.PuanlamaGetPayload<{
  select: typeof ratingListSelect;
}>;

export type StoredRateableJobRecord = {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
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
  publicId: string;
  jobId: number;
  jobPublicId: string;
  requestId: number;
  requestPublicId: string;
  puanDegeri: number;
  yorum: string | null;
  tarih: Date;
  baslangicSehri: string;
  varisSehri: string;
  puanlayanId: number;
  puanlayanPublicId: string;
  puanlayanName: string;
  puanlayanUsername: string;
  puanlananId: number;
  puanlananPublicId: string;
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

  //Puanlama tanim tablosundan SAYISAL_1_5 gibi scheme id'sini bulur.
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
    jobId: PublicEntityId,
    participantId: number
  ): Promise<StoredRateableJobRecord | null> {
    //Nakliye sadece musteri veya nakliyeci tarafindan puanlanabilir; sorgu bu sahiplik
    //kontrolunu OR kosuluyla DB seviyesinde yapar.
    const job = await this.prisma.client.nakliye.findFirst({
      where: {
        ...publicEntityWhere(jobId),
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
    //Puanlama kaydini olusturur. Unique constraint tekrar puanlamayi DB seviyesinde de engeller.
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
    //Kullanicinin verdigi puanlari tarih sirasina gore getirir.
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
    //Kullanicinin aldigi puanlari tarih sirasina gore getirir.
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
    //Alinan puanlar nakliyeci rolu ve musteri rolu icin ayri aggregate edilir.
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
    //Nakliye kaydini puanlama kararinda gereken sade forma cevirir.
    return {
      id: job.id,
      publicId: job.publicId,
      requestId: job.istek.id,
      requestPublicId: job.istek.publicId,
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
    //Yeni olusan veya mevcut puan kaydini ortak submitted rating formatina cevirir.
    return {
      id: rating.id,
      publicId: rating.publicId,
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
    //Liste response'lari icin nakliye rotasi, puanlayan ve puanlanan bilgileri birlestirilir.
    return {
      id: rating.id,
      publicId: rating.publicId,
      jobId: rating.nakliye.id,
      jobPublicId: rating.nakliye.publicId,
      requestId: rating.nakliye.istek.id,
      requestPublicId: rating.nakliye.istek.publicId,
      puanDegeri: rating.puanDegeri,
      yorum: rating.yorum,
      tarih: rating.tarih,
      baslangicSehri: rating.nakliye.istek.baslangicSehri,
      varisSehri: rating.nakliye.istek.varisSehri,
      puanlayanId: rating.puanlayan.id,
      puanlayanPublicId: rating.puanlayan.publicId,
      puanlayanName: `${rating.puanlayan.ad} ${rating.puanlayan.soyad}`.trim(),
      puanlayanUsername: rating.puanlayan.kullaniciAdi,
      puanlananId: rating.puanlanan.id,
      puanlananPublicId: rating.puanlanan.publicId,
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
    //Aggregate sonucunda puan yoksa averageRating null kalir, sayi her zaman doner.
    return {
      averageRating:
        typeof aggregate._avg.puanDegeri === "number"
          ? Number(aggregate._avg.puanDegeri.toFixed(2))
          : null,
      ratingCount: aggregate._count._all,
    };
  }
}
