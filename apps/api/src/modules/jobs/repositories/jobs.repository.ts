import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const jobRecordSelect = {
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
  istek: {
    select: {
      id: true,
      baslangicSehri: true,
      varisSehri: true,
      baslangicEnlem: true,
      baslangicBoylam: true,
      varisEnlem: true,
      varisBoylam: true,
      yukDetay: true,
      silmeTarihi: true,
      durum: {
        select: {
          durumTuru: true,
          durumAdi: true,
        },
      },
      musteri: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          kullaniciAdi: true,
        },
      },
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
      silmeTarihi: true,
      aracBilgisi: {
        select: {
          marka: true,
          model: true,
        },
      },
    },
  },
} satisfies Prisma.NakliyeSelect;

type StoredJobQuery = Prisma.NakliyeGetPayload<{
  select: typeof jobRecordSelect;
}>;

export type StoredJobRecord = {
  id: number;
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  anlasilanFiyat: number;
  aracPlaka: string;
  durumAdi: string;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimTarihi: Date | null;
  counterpartyId: number;
  counterpartyName: string;
  counterpartyUsername: string;
};

export type StoredJobDetailRecord = {
  id: number;
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  yukDetay: string;
  anlasilanFiyat: number;
  durumTuru: string;
  durumAdi: string;
  requestStatusTuru: string;
  requestStatusAdi: string;
  requestDeletedAt: Date | null;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimTarihi: Date | null;
  carrierId: number;
  carrierName: string;
  carrierUsername: string;
  customerId: number;
  customerName: string;
  customerUsername: string;
  aracId: number;
  aracPlaka: string;
  aracMarka: string;
  aracModel: string;
  aracDeletedAt: Date | null;
};

export type CompleteJobInput = {
  jobId: number;
  carrierId: number;
  requestId: number;
  startedStatusId: number;
  completedJobStatusId: number;
  agreedRequestStatusId: number;
  completedRequestStatusId: number;
};

export type CompleteJobResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "job_not_started" | "request_not_agreed";
    };

class JobCompletionStateError extends Error {
  constructor(readonly reason: "job_not_started" | "request_not_agreed") {
    super(reason);
  }
}

@Injectable()
export class JobsRepository {
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

  async findManyByCarrierId(carrierId: number): Promise<StoredJobRecord[]> {
    const jobs = await this.prisma.client.nakliye.findMany({
      where: {
        nakliyeciId: carrierId,
      },
      orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
      select: jobRecordSelect,
    });

    return jobs.map((job) => this.mapStoredJob(job, "carrier"));
  }

  async findManyByCustomerId(customerId: number): Promise<StoredJobRecord[]> {
    const jobs = await this.prisma.client.nakliye.findMany({
      where: {
        istek: {
          musteriId: customerId,
        },
      },
      orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
      select: jobRecordSelect,
    });

    return jobs.map((job) => this.mapStoredJob(job, "customer"));
  }

  async findByIdAndCarrierId(
    jobId: number,
    carrierId: number
  ): Promise<StoredJobDetailRecord | null> {
    const job = await this.prisma.client.nakliye.findFirst({
      where: {
        id: jobId,
        nakliyeciId: carrierId,
      },
      select: jobRecordSelect,
    });

    return job ? this.mapStoredJobDetail(job) : null;
  }

  async findByIdAndCustomerId(
    jobId: number,
    customerId: number
  ): Promise<StoredJobDetailRecord | null> {
    const job = await this.prisma.client.nakliye.findFirst({
      where: {
        id: jobId,
        istek: {
          musteriId: customerId,
        },
      },
      select: jobRecordSelect,
    });

    return job ? this.mapStoredJobDetail(job) : null;
  }

  async startByIdAndCarrierId(
    jobId: number,
    carrierId: number,
    createdStatusId: number,
    startedStatusId: number
  ): Promise<boolean> {
    const result = await this.prisma.client.nakliye.updateMany({
      where: {
        id: jobId,
        nakliyeciId: carrierId,
        durumId: createdStatusId,
      },
      data: {
        durumId: startedStatusId,
        baslangicTarihi: new Date(),
      },
    });

    return result.count > 0;
  }

  async completeByIdAndCarrierId(
    input: CompleteJobInput
  ): Promise<CompleteJobResult> {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const completedJob = await tx.nakliye.updateMany({
          where: {
            id: input.jobId,
            nakliyeciId: input.carrierId,
            durumId: input.startedStatusId,
          },
          data: {
            durumId: input.completedJobStatusId,
            teslimTarihi: new Date(),
          },
        });

        if (completedJob.count === 0) {
          throw new JobCompletionStateError("job_not_started");
        }

        const completedRequest = await tx.istek.updateMany({
          where: {
            id: input.requestId,
            durumId: input.agreedRequestStatusId,
          },
          data: {
            durumId: input.completedRequestStatusId,
          },
        });

        if (completedRequest.count === 0) {
          throw new JobCompletionStateError("request_not_agreed");
        }

        return {
          ok: true,
        };
      });
    } catch (error) {
      if (error instanceof JobCompletionStateError) {
        return {
          ok: false,
          reason: error.reason,
        };
      }

      throw error;
    }
  }

  private mapStoredJob(
    job: StoredJobQuery,
    audience: "carrier" | "customer"
  ): StoredJobRecord {
    const counterparty =
      audience === "carrier" ? job.istek.musteri : job.nakliyeci;

    return {
      id: job.id,
      requestId: job.istek.id,
      baslangicSehri: job.istek.baslangicSehri,
      varisSehri: job.istek.varisSehri,
      anlasilanFiyat: job.anlasilanFiyat.toNumber(),
      aracPlaka: job.arac.plaka,
      durumAdi: job.durum.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
      counterpartyId: counterparty.id,
      counterpartyName: `${counterparty.ad} ${counterparty.soyad}`.trim(),
      counterpartyUsername: counterparty.kullaniciAdi,
    };
  }

  private mapStoredJobDetail(job: StoredJobQuery): StoredJobDetailRecord {
    return {
      id: job.id,
      requestId: job.istek.id,
      baslangicSehri: job.istek.baslangicSehri,
      varisSehri: job.istek.varisSehri,
      baslangicEnlem: job.istek.baslangicEnlem.toNumber(),
      baslangicBoylam: job.istek.baslangicBoylam.toNumber(),
      varisEnlem: job.istek.varisEnlem.toNumber(),
      varisBoylam: job.istek.varisBoylam.toNumber(),
      yukDetay: job.istek.yukDetay,
      anlasilanFiyat: job.anlasilanFiyat.toNumber(),
      durumTuru: job.durum.durumTuru,
      durumAdi: job.durum.durumAdi,
      requestStatusTuru: job.istek.durum.durumTuru,
      requestStatusAdi: job.istek.durum.durumAdi,
      requestDeletedAt: job.istek.silmeTarihi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
      carrierId: job.nakliyeci.id,
      carrierName: `${job.nakliyeci.ad} ${job.nakliyeci.soyad}`.trim(),
      carrierUsername: job.nakliyeci.kullaniciAdi,
      customerId: job.istek.musteri.id,
      customerName: `${job.istek.musteri.ad} ${job.istek.musteri.soyad}`.trim(),
      customerUsername: job.istek.musteri.kullaniciAdi,
      aracId: job.arac.id,
      aracPlaka: job.arac.plaka,
      aracMarka: job.arac.aracBilgisi.marka,
      aracModel: job.arac.aracBilgisi.model,
      aracDeletedAt: job.arac.silmeTarihi,
    };
  }
}
