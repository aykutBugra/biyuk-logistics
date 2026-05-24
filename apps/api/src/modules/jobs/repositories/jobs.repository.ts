import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import type { StoredSubmittedRatingRecord } from "../../ratings/rating-context.helpers";


//bu select ifadesi, nakliye kaydını ve ilişkili verileri sorgularken hangi alanların 
//alınacağını tanımlar.tek sorguda sunlar gelir:
//nakliye bilgisi
//istek bilgisi
//müşteri bilgisi
//nakliyeci bilgisi
//araç bilgisi
//durum bilgisi
//puanlama bilgisi

const jobRecordSelect = {
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
  istek: {
    select: {
      id: true,
      publicId: true,
      baslangicSehri: true,
      varisSehri: true,
      baslangicKonumMetni: true,
      varisKonumMetni: true,
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
          publicId: true,
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
      silmeTarihi: true,
      aracBilgisi: {
        select: {
          marka: true,
          model: true,
        },
      },
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
} satisfies Prisma.NakliyeSelect;


//storedJobQuery, Prisma tarafından döndürülen nakliye kaydının TypeScript türüdür.
type StoredJobQuery = Prisma.NakliyeGetPayload<{
  select: typeof jobRecordSelect;
}>;

//storedJobRecord, API'nin diğer katmanlarında kullanılmak üzere dönüştürülmüş nakliye kaydının türüdür.
export type StoredJobRecord = {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
  baslangicSehri: string;
  varisSehri: string;
  anlasilanFiyat: number;
  aracPlaka: string;
  durumAdi: string;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimBildirimTarihi: Date | null;
  teslimTarihi: Date | null;
  planlananAlimTarihi: Date | null;
  tahminiTeslimTarihi: Date | null;
  counterpartyId: number;
  counterpartyPublicId: string;
  counterpartyName: string;
  counterpartyUsername: string;
};

//storedJobDetailRecord, API'nin diğer katmanlarında kullanılmak üzere dönüştürülmüş nakliye detay kaydının türüdür.
export type StoredJobDetailRecord = {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
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
  anlasilanFiyat: number;
  durumTuru: string;
  durumAdi: string;
  requestStatusTuru: string;
  requestStatusAdi: string;
  requestDeletedAt: Date | null;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimBildirimTarihi: Date | null;
  teslimTarihi: Date | null;
  planlananAlimTarihi: Date | null;
  tahminiTeslimTarihi: Date | null;
  carrierId: number;
  carrierPublicId: string;
  carrierName: string;
  carrierUsername: string;
  customerId: number;
  customerPublicId: string;
  customerName: string;
  customerUsername: string;
  aracId: number;
  aracPublicId: string;
  aracPlaka: string;
  aracMarka: string;
  aracModel: string;
  aracDeletedAt: Date | null;
  ratings: StoredSubmittedRatingRecord[];
};

export type MarkDeliveredJobInput = {
  jobId: number;
  carrierId: number;
  startedStatusId: number;
  pendingDeliveryStatusId: number;
};

export type MarkDeliveredJobResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "job_not_started";
    };

export type ConfirmDeliveryJobInput = {
  jobId: number;
  customerId: number;
  requestId: number;
  pendingDeliveryStatusId: number;
  completedJobStatusId: number;
  agreedRequestStatusId: number;
  completedRequestStatusId: number;
};

export type ConfirmDeliveryJobResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "job_not_pending_delivery" | "request_not_agreed";
    };

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  //findStatusIdByTypeAndName metodu, durum türü ve durum adına göre durum ID'sini bulmaya çalışır.
  //örneğin, nakliye durumları için "nakliye" türünde "olusturuldu" adında bir durumun ID'sini bulmak isteyebiliriz.
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

  //nakliyecinin kendi islerini listeler. 
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

  //müşterinin kendi islerini listeler.
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

  //bu detay sorgusu da hem isi bulur hem de bu isi gercekten o nakliyeciye
  //ait mi kontrol eder. Boylece baska nakliyecilerin islerine erisim engellenmis olur.
  async findByIdAndCarrierId(
    jobId: PublicEntityId,
    carrierId: number
  ): Promise<StoredJobDetailRecord | null> {
    const job = await this.prisma.client.nakliye.findFirst({
      where: {
        ...publicEntityWhere(jobId),
        nakliyeciId: carrierId,
      },
      select: jobRecordSelect,
    });

    return job ? this.mapStoredJobDetail(job) : null;
  }

  //bu detay sorgusu da hem isi bulur hem de bu isi gercekten o musteriye
  //ait mi kontrol eder. Boylece baska musterilerin islerine erisim engellenmis olur.
  async findByIdAndCustomerId(
    jobId: PublicEntityId,
    customerId: number
  ): Promise<StoredJobDetailRecord | null> {
    const job = await this.prisma.client.nakliye.findFirst({
      where: {
        ...publicEntityWhere(jobId),
        istek: {
          musteriId: customerId,
        },
      },
      select: jobRecordSelect,
    });

    return job ? this.mapStoredJobDetail(job) : null;
  }


  //nakliyeyi baslatir .bu metot, nakliyecinin belirli bir nakliyeyi başlatmasını sağlar.
  //sartlari:
  //nakliyeId'si currentUser.id'sine ait olmalı
  //nakliye durumu "olusturuldu" olmalı
  //durum "baslatildi" olarak güncellenir ve baslangicTarihi atanir.
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

  // Carrier delivery mark is not final completion; it only moves the shipment
  // into customer-confirmation pending state.
  async markDeliveredByIdAndCarrierIdInTransaction(
    tx: Prisma.TransactionClient,
    input: MarkDeliveredJobInput
  ): Promise<MarkDeliveredJobResult> {
    const result = await tx.nakliye.updateMany({
      where: {
        id: input.jobId,
        nakliyeciId: input.carrierId,
        durumId: input.startedStatusId,
      },
      data: {
        durumId: input.pendingDeliveryStatusId,
        teslimBildirimTarihi: new Date(),
      },
    });

    if (result.count === 0) {
      return {
        ok: false,
        reason: "job_not_started",
      };
    }

    return {
      ok: true,
    };
  }

  async confirmDeliveryByIdAndCustomerIdInTransaction(
    tx: Prisma.TransactionClient,
    input: ConfirmDeliveryJobInput
  ): Promise<ConfirmDeliveryJobResult> {
    const completedJob = await tx.nakliye.updateMany({
      where: {
        id: input.jobId,
        durumId: input.pendingDeliveryStatusId,
        istek: {
          musteriId: input.customerId,
        },
      },
      data: {
        durumId: input.completedJobStatusId,
        teslimTarihi: new Date(),
      },
    });

    if (completedJob.count === 0) {
      return {
        ok: false,
        reason: "job_not_pending_delivery",
      };
    }

    const completedRequest = await tx.istek.updateMany({
      where: {
        id: input.requestId,
        musteriId: input.customerId,
        durumId: input.agreedRequestStatusId,
      },
      data: {
        durumId: input.completedRequestStatusId,
      },
    });

    if (completedRequest.count === 0) {
      return {
        ok: false,
        reason: "request_not_agreed",
      };
    }

    return {
      ok: true,
    };
  }

  //bu iki metot, Prisma tarafından döndürülen nakliye kaydını
  //API'nin diğer katmanlarında kullanılmak üzere dönüştürür.
  private mapStoredJob(
    job: StoredJobQuery,
    audience: "carrier" | "customer"
  ): StoredJobRecord {
    const counterparty =
    //eger ekrana nakliyeci bakiyorsa counterparty musteri olur. 
    //Eger ekrana musteri bakiyorsa counterparty nakliyeci olur. Boylece her iki taraf da ayni yapiyi kullanarak kars taraftaki kullanici bilgilerine erisebilir.
      audience === "carrier" ? job.istek.musteri : job.nakliyeci;

    return {
      id: job.id,
      publicId: job.publicId,
      requestId: job.istek.id,
      requestPublicId: job.istek.publicId,
      baslangicSehri: job.istek.baslangicSehri,
      varisSehri: job.istek.varisSehri,
      anlasilanFiyat: job.anlasilanFiyat.toNumber(),
      aracPlaka: job.arac.plaka,
      durumAdi: job.durum.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimBildirimTarihi: job.teslimBildirimTarihi,
      teslimTarihi: job.teslimTarihi,
      planlananAlimTarihi: job.planlananAlimTarihi,
      tahminiTeslimTarihi: job.tahminiTeslimTarihi,
      counterpartyId: counterparty.id,
      counterpartyPublicId: counterparty.publicId,
      counterpartyName: `${counterparty.ad} ${counterparty.soyad}`.trim(),
      counterpartyUsername: counterparty.kullaniciAdi,
    };
  }

  private mapStoredJobDetail(job: StoredJobQuery): StoredJobDetailRecord {
    return {
      id: job.id,
      publicId: job.publicId,
      requestId: job.istek.id,
      requestPublicId: job.istek.publicId,
      baslangicSehri: job.istek.baslangicSehri,
      varisSehri: job.istek.varisSehri,
      baslangicKonumMetni: job.istek.baslangicKonumMetni,
      varisKonumMetni: job.istek.varisKonumMetni,
      baslangicEnlem: job.istek.baslangicEnlem.toNumber(),
      baslangicBoylam: job.istek.baslangicBoylam.toNumber(),
      varisEnlem: job.istek.varisEnlem.toNumber(),
      varisBoylam: job.istek.varisBoylam.toNumber(),
      tekTasimaIstiyor: job.istek.tekTasimaIstiyor,
      agirlikKg: job.istek.agirlikKg?.toNumber() ?? null,
      hacimM3: job.istek.hacimM3?.toNumber() ?? null,
      yukTipi: job.istek.yukTipi,
      tasimaTarihi: job.istek.tasimaTarihi,
      yukDetay: job.istek.yukDetay,
      anlasilanFiyat: job.anlasilanFiyat.toNumber(),
      durumTuru: job.durum.durumTuru,
      durumAdi: job.durum.durumAdi,
      requestStatusTuru: job.istek.durum.durumTuru,
      requestStatusAdi: job.istek.durum.durumAdi,
      requestDeletedAt: job.istek.silmeTarihi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimBildirimTarihi: job.teslimBildirimTarihi,
      teslimTarihi: job.teslimTarihi,
      planlananAlimTarihi: job.planlananAlimTarihi,
      tahminiTeslimTarihi: job.tahminiTeslimTarihi,
      carrierId: job.nakliyeci.id,
      carrierPublicId: job.nakliyeci.publicId,
      carrierName: `${job.nakliyeci.ad} ${job.nakliyeci.soyad}`.trim(),
      carrierUsername: job.nakliyeci.kullaniciAdi,
      customerId: job.istek.musteri.id,
      customerPublicId: job.istek.musteri.publicId,
      customerName: `${job.istek.musteri.ad} ${job.istek.musteri.soyad}`.trim(),
      customerUsername: job.istek.musteri.kullaniciAdi,
      aracId: job.arac.id,
      aracPublicId: job.arac.publicId,
      aracPlaka: job.arac.plaka,
      aracMarka: job.arac.aracBilgisi.marka,
      aracModel: job.arac.aracBilgisi.model,
      aracDeletedAt: job.arac.silmeTarihi,
      ratings: job.puanlar.map((rating) => ({
        id: rating.id,
        publicId: rating.publicId,
        puanlayanId: rating.puanlayanId,
        puanlananId: rating.puanlananId,
        puanDegeri: rating.puanDegeri,
        yorum: rating.yorum,
        tarih: rating.tarih,
      })),
    };
  }
}
