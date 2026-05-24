import { Inject, Injectable, Optional } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { PublicEntityId } from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { formatDateOnlyFromDate } from "../../common/utils/date-only";
import { unwrapTransactionResult } from "../../common/utils/unwrap-transaction-result";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { NotificationPublisherPort } from "../notifications/notification-publisher.port";
import { NOTIFICATION_PUBLISHER } from "../notifications/notification-publisher.token";
import { OfferThreadsService } from "../offer-threads/offer-threads.service";
import { JobAudienceQueryDto, type JobAudience } from "./dto/job-audience-query.dto";
import { JobDetailResponseDto } from "./dto/job-detail-response.dto";
import { JobListItemResponseDto } from "./dto/job-list-item-response.dto";
import {
  JobsRepository,
  type StoredJobDetailRecord,
  type StoredJobRecord,
} from "./repositories/jobs.repository";
import { buildRatingContext } from "../ratings/rating-context.helpers";
import {
  VEHICLE_CAPACITY_RELEASE_REASONS,
  VehicleCapacityService,
} from "../vehicle-capacity/vehicle-capacity.service";

//nakliye tablosu durumlaridir gercek tasima isinin hangi asamada oldugunu gosterir. 
const CREATED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "OLUSTURULDU",
} as const;

const STARTED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "BASLATILDI",
} as const;

const PENDING_DELIVERY_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TESLIM_BEKLIYOR",
} as const;

const COMPLETED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TAMAMLANDI",
} as const;


//istek tablosu durumlaridir. musterinin nakliye istegi hangi asamada oldugunu gosterir.
const AGREED_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "ANLASILDI",
} as const;

const COMPLETED_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "TAMAMLANDI",
} as const;



@Injectable()
export class JobsService {
  constructor(
    //bu servis asagidaki 4 seye ihtiyac duyuyor .
    //1. JobsRepository: Nakliye verilerine erişmek ve güncellemek 
    //2. NotificationsPublisher: Nakliye işlemleri sırasında ilgili taraflara bildirim göndermek için 
    //3. VehicleCapacityService: Nakliye işlemi sırasında araç kapasitesi yönetimi yapmak için 
    //4. PrismaService: Veritabanı işlemlerini yönetmek için kullanılan Prisma ORM'nin servisidir
    private readonly jobsRepository: JobsRepository,
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly notificationsPublisher: NotificationPublisherPort,
    @Optional()
    @Inject(OfferThreadsService)
    private readonly offerThreadsService: OfferThreadsService | undefined,
    private readonly vehicleCapacityService: VehicleCapacityService,
    private readonly prisma: PrismaService
  ) {}


  // Kullanıcının kendi nakliye işlerini listeler.
  // Kullanıcı hem MUSTERI hem NAKLIYECI rolüne sahip olabilir; bu yüzden ?as=customer
  // veya ?as=carrier ile hangi rolden bakıldığı netleştirilir. Carrier bağlamında
  // nakliyeci olarak üstlendiği işler, customer bağlamında müşteri olarak oluşturduğu
  // isteklerden doğan işler döner.
  async getMine(
    currentUser: AuthenticatedUser,
    query: JobAudienceQueryDto
  ): Promise<JobListItemResponseDto[]> {
    const audience = this.resolveAudience(currentUser, query.as);

    if (audience === "carrier") {
      const jobs = await this.jobsRepository.findManyByCarrierId(currentUser.id);
      return jobs.map((job) => this.toListItemResponse(job, audience));
    }

    const jobs = await this.jobsRepository.findManyByCustomerId(currentUser.id);
    return jobs.map((job) => this.toListItemResponse(job, audience));
  }

  //belirli bir nakliyenin datayini getirir. Erişim kontrolü yapılır. 
  //Nakliyeci sadece kendi nakliyelerini, müşteri sadece kendi isteklerinden doğan 
  //nakliyeleri görebilir.
  async getById(
    currentUser: AuthenticatedUser,
    jobId: PublicEntityId,
    query: JobAudienceQueryDto
  ): Promise<JobDetailResponseDto> {
    const audience = this.resolveAudience(currentUser, query.as);
    const job = await this.findReadableJob(currentUser, jobId, audience);

    return this.toDetailResponse(job, currentUser, audience);
  }





  // Nakliyeci, nakliyeyi başlatır. Nakliye sadece "olusturuldu" durumundayken başlatılabilir.
  async startById(
    currentUser: AuthenticatedUser,
    jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    //is gercekten bu nakliyeciye mi ait konrol edilir. Boylece baska bir nakliyecinin nakliyesi baslatilamaz.
    const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);
    //is yoksa bulunamadi don
    if (!job) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadı.");
    }
    //Bu kontrol, nakliyeci ve müşteri aynı kullanıcıysa lifecycle işlemini engeller.
    this.assertDistinctShipmentParticipants(job);
    //İş sadece şu durumdaysa başlatılabilir:NAKLIYE / OLUSTURULDU
    if (!this.isJobCreated(job.durumTuru, job.durumAdi)) {
      throw AppErrors.conflict(AppErrorCode.JOB_CANNOT_START, "Nakliye artık başlatılamaz.");
    }

    //Burada iki durumun DB id değeri bulunuyor.
    const [createdStatusId, startedStatusId] = await Promise.all([
      this.requireStatusId(
        CREATED_JOB_STATUS.durumTuru,
        CREATED_JOB_STATUS.durumAdi,
        "Shipment created status"
      ),
      this.requireStatusId(
        STARTED_JOB_STATUS.durumTuru,
        STARTED_JOB_STATUS.durumAdi,
        "Shipment started status"
      ),
    ]);

    //sonra repo ile update işlemi yapılıyor. Bu update işlemi, nakliye durumunu 
    //"başlatıldı" olarak değiştirir.
    const wasStarted = await this.jobsRepository.startByIdAndCarrierId(
      job.id,
      currentUser.id,
      createdStatusId,
      startedStatusId
    );

    if (!wasStarted) {
      throw AppErrors.conflict(AppErrorCode.JOB_CANNOT_START, "Nakliye artık başlatılamaz.");
    }

    //guncel is tekrar okunur 
    const updatedJob = await this.jobsRepository.findByIdAndCarrierId(
      jobId,
      currentUser.id
    );

    if (!updatedJob) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadı.");
    }

    //ilgili taraflara bildirim gonderilir 
    await this.notificationsPublisher.publishJobStarted({
      customerId: updatedJob.customerId,
      jobId: updatedJob.publicId,
      requestId: updatedJob.requestPublicId,
      actorUserId: currentUser.id,
      route: {
        baslangicSehri: updatedJob.baslangicSehri,
        varisSehri: updatedJob.varisSehri,
      },
    });

    return this.toDetailResponse(updatedJob, currentUser, "carrier");
  }





  async completeById(
    currentUser: AuthenticatedUser,
    jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    return this.markDeliveredById(currentUser, jobId);
  }

  async markDeliveredById(
    currentUser: AuthenticatedUser,
    jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);

    if (!job) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadÄ±.");
    }

    this.assertDistinctShipmentParticipants(job);

    if (!this.isJobStarted(job.durumTuru, job.durumAdi)) {
      throw AppErrors.conflict(
        AppErrorCode.JOB_DELIVERY_NOT_ELIGIBLE,
        "Nakliye teslim bildirimi icin uygun degil."
      );
    }

    if (!this.isRequestAgreed(job.requestStatusTuru, job.requestStatusAdi)) {
      throw AppErrors.conflict(
        AppErrorCode.JOB_DELIVERY_NOT_ELIGIBLE,
        "Nakliye teslim bildirimi icin uygun degil."
      );
    }

    const [startedStatusId, pendingDeliveryStatusId] = await Promise.all([
      this.requireStatusId(
        STARTED_JOB_STATUS.durumTuru,
        STARTED_JOB_STATUS.durumAdi,
        "Shipment started status"
      ),
      this.requireStatusId(
        PENDING_DELIVERY_JOB_STATUS.durumTuru,
        PENDING_DELIVERY_JOB_STATUS.durumAdi,
        "Shipment pending delivery confirmation status"
      ),
    ]);

    await this.prisma.client.$transaction(
      async (tx) => {
        unwrapTransactionResult(
          await this.jobsRepository.markDeliveredByIdAndCarrierIdInTransaction(tx, {
            jobId: job.id,
            carrierId: currentUser.id,
            startedStatusId,
            pendingDeliveryStatusId,
          }),
          () =>
            AppErrors.conflict(
              AppErrorCode.JOB_DELIVERY_NOT_ELIGIBLE,
              "Nakliye teslim bildirimi icin uygun degil."
            )
        );

        await this.requireOfferThreadsService().appendShipmentSystemEventByRequestId(
          job.requestId,
          currentUser.id,
          "DELIVERY_PENDING_CONFIRMATION",
          tx
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    const updatedJob = await this.jobsRepository.findByIdAndCarrierId(
      jobId,
      currentUser.id
    );

    if (!updatedJob) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadÄ±.");
    }

    await this.notificationsPublisher.publishDeliveryConfirmationRequested({
      customerId: updatedJob.customerId,
      jobId: updatedJob.publicId,
      requestId: updatedJob.requestPublicId,
      actorUserId: currentUser.id,
      route: {
        baslangicSehri: updatedJob.baslangicSehri,
        varisSehri: updatedJob.varisSehri,
      },
    });

    return this.toDetailResponse(updatedJob, currentUser, "carrier");
  }

  async confirmDeliveryById(
    currentUser: AuthenticatedUser,
    jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const job = await this.jobsRepository.findByIdAndCustomerId(jobId, currentUser.id);

    if (!job) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadÄ±.");
    }

    this.assertDistinctShipmentParticipants(job);

    if (!this.isJobPendingDelivery(job.durumTuru, job.durumAdi)) {
      throw AppErrors.conflict(
        AppErrorCode.JOB_CONFIRM_NOT_ELIGIBLE,
        "Nakliye teslim onayi icin uygun degil."
      );
    }

    if (!this.isRequestAgreed(job.requestStatusTuru, job.requestStatusAdi)) {
      throw AppErrors.conflict(
        AppErrorCode.JOB_CONFIRM_NOT_ELIGIBLE,
        "Nakliye teslim onayi icin uygun degil."
      );
    }

    const [
      pendingDeliveryStatusId,
      completedJobStatusId,
      agreedRequestStatusId,
      completedRequestStatusId,
    ] = await Promise.all([
      this.requireStatusId(
        PENDING_DELIVERY_JOB_STATUS.durumTuru,
        PENDING_DELIVERY_JOB_STATUS.durumAdi,
        "Shipment pending delivery confirmation status"
      ),
      this.requireStatusId(
        COMPLETED_JOB_STATUS.durumTuru,
        COMPLETED_JOB_STATUS.durumAdi,
        "Shipment completed status"
      ),
      this.requireStatusId(
        AGREED_REQUEST_STATUS.durumTuru,
        AGREED_REQUEST_STATUS.durumAdi,
        "Transport request agreed status"
      ),
      this.requireStatusId(
        COMPLETED_REQUEST_STATUS.durumTuru,
        COMPLETED_REQUEST_STATUS.durumAdi,
        "Transport request completed status"
      ),
    ]);

    await this.prisma.client.$transaction(
      async (tx) => {
        unwrapTransactionResult(
          await this.jobsRepository.confirmDeliveryByIdAndCustomerIdInTransaction(tx, {
            jobId: job.id,
            customerId: currentUser.id,
            requestId: job.requestId,
            pendingDeliveryStatusId,
            completedJobStatusId,
            agreedRequestStatusId,
            completedRequestStatusId,
          }),
          (reason) =>
            AppErrors.conflict(
              AppErrorCode.JOB_CONFIRM_NOT_ELIGIBLE,
              reason === "request_not_agreed"
                ? "Nakliye teslim onayi icin uygun degil cunku ilgili istek artik anlasildi durumunda degil."
                : "Nakliye teslim onayi icin uygun degil."
            )
        );

        await this.vehicleCapacityService.releaseReservationByShipmentId(
          job.id,
          VEHICLE_CAPACITY_RELEASE_REASONS.COMPLETED,
          tx
        );

        await this.requireOfferThreadsService().appendDeliveryConfirmedAndCloseByRequestId(
          job.requestId,
          currentUser.id,
          tx
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    const updatedJob = await this.jobsRepository.findByIdAndCustomerId(
      jobId,
      currentUser.id
    );

    if (!updatedJob) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadÄ±.");
    }

    await Promise.all([
      this.notificationsPublisher.publishJobCompletedForCarrier({
        carrierId: updatedJob.carrierId,
        jobId: updatedJob.publicId,
        requestId: updatedJob.requestPublicId,
        actorUserId: currentUser.id,
        route: {
          baslangicSehri: updatedJob.baslangicSehri,
          varisSehri: updatedJob.varisSehri,
        },
      }),
      this.notificationsPublisher.publishRatingPending({
        userId: updatedJob.carrierId,
        jobId: updatedJob.publicId,
        actorUserId: currentUser.id,
      }),
    ]);

    return this.toDetailResponse(updatedJob, currentUser, "customer");
  }

  //bu metot, belirli bir nakliye kaydını okuyarak kullanıcının bu kayda erişim hakkı olup olmadığını kontrol eder.
  private async findReadableJob(
    currentUser: AuthenticatedUser,
    jobId: PublicEntityId,
    audience: JobAudience
  ): Promise<StoredJobDetailRecord> {
    if (audience === "carrier") {
      const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);

      if (!job) {
        throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadı.");
      }

      return job;
    }

    const job = await this.jobsRepository.findByIdAndCustomerId(jobId, currentUser.id);

    if (!job) {
      throw AppErrors.notFound(AppErrorCode.JOB_NOT_FOUND, "Nakliye bulunamadı.");
    }

    return job;
  }

  //bu metot, nakliye ve istek durumlarının DB'deki id değerlerini çözer. Bu id'ler, nakliye başlatma ve tamamlama işlemlerinde kullanılır.1
  private async requireStatusId(
    durumTuru: string,
    durumAdi: string,
    label: string
  ): Promise<number> {
    const statusId = await this.jobsRepository.findStatusIdByTypeAndName(
      durumTuru,
      durumAdi
    );

    if (statusId !== null) {
      return statusId;
    }

    throw AppErrors.internal(
      AppErrorCode.JOB_INTERNAL,
      `${label} is not configured: ${durumTuru}/${durumAdi}.`
    );
  }

  private requireOfferThreadsService(): OfferThreadsService {
    if (this.offerThreadsService) {
      return this.offerThreadsService;
    }

    throw AppErrors.internal(
      AppErrorCode.JOB_THREAD_NOT_CONFIGURED,
      "Offer thread service is not configured."
    );
  }

  private isCarrier(currentUser: AuthenticatedUser): boolean {
    return currentUser.roles.includes(ROLE_NAMES.NAKLIYECI);
  }

  private isCustomer(currentUser: AuthenticatedUser): boolean {
    return currentUser.roles.includes(ROLE_NAMES.MUSTERI);
  }

  private assertCarrierRole(currentUser: AuthenticatedUser) {
    if (this.isCarrier(currentUser)) {
      return;
    }

    throw AppErrors.forbidden(
      AppErrorCode.JOB_FORBIDDEN,
      "Only carriers can manage shipment lifecycle."
    );
  }

  private assertCustomerRole(currentUser: AuthenticatedUser) {
    if (this.isCustomer(currentUser)) {
      return;
    }

    throw AppErrors.forbidden(
      AppErrorCode.JOB_FORBIDDEN,
      "Only customers can confirm delivery."
    );
  }


  //kullanicinin rolleri kontrol edilir
  //hicbiri yoksa erisim engellenir.
  //birden fazla rol varsa, hangi rolden bakildigi belirtilmedikce erisim engellenir.
  private resolveAudience(
    currentUser: AuthenticatedUser,
    requestedAudience?: JobAudience
  ): JobAudience {
    const hasCarrierRole = this.isCarrier(currentUser);
    const hasCustomerRole = this.isCustomer(currentUser);

    if (!hasCarrierRole && !hasCustomerRole) {
      throw AppErrors.forbidden(
        AppErrorCode.JOB_FORBIDDEN,
        "Sadece nakliyeciler ve müşteriler bu işlere erişebilir."
      );
    }

    if (requestedAudience === "carrier") {
      if (!hasCarrierRole) {
        throw AppErrors.forbidden(
          AppErrorCode.JOB_CONTEXT_FORBIDDEN,
          "Nakliyeci context'i mevcut kullanıcı için mevcut değil."
        );
      }

      return requestedAudience;
    }

    if (requestedAudience === "customer") {
      if (!hasCustomerRole) {
        throw AppErrors.forbidden(
          AppErrorCode.JOB_CONTEXT_FORBIDDEN,
          "Müşteri context'i mevcut kullanıcı için mevcut değil."
        );
      }

      return requestedAudience;
    }

    //Yani hem müşteri hem nakliyeci olan biri liste/detay okurken hangi taraftan baktığını söylemek zorunda:
    if (hasCarrierRole && hasCustomerRole) {
      throw AppErrors.conflict(
        AppErrorCode.JOB_CONFLICT,
        "cift rolleri olan kullanıcılar, iş okuma işlemleri için ?as=customer veya ?as=carrier parametresini belirtmek zorundadır."
      );
    }

    return hasCarrierRole ? "carrier" : "customer";
  }

  //assertDistinctShipmentParticipants metodu, nakliyeci ve müşterinin aynı kullanıcıya karşılık gelmesi durumunu kontrol eder. 
  //Eğer her iki taraf da aynı kullanıcıysa, nakliye işleminin devam etmesini engellemek için bir ConflictException fırlatır. 
  // Bu, nakliye sürecinde her iki tarafın da farklı kullanıcılar olması gerektiği kuralını uygular ve böylece potansiyel olarak hatalı veya kötü niyetli işlemlerin önüne geçer.
  private assertDistinctShipmentParticipants(
    job: Pick<StoredJobDetailRecord, "carrierId" | "customerId">
  ) {
    if (job.carrierId !== job.customerId) {
      return;
    }

    throw AppErrors.conflict(
      AppErrorCode.JOB_CONFLICT,
      "Gönderi yaşam döngüsü, nakliyeci ve müşteri aynı kullanıcıya yönlendirildiği için bloke olmuştur."
    );
  }

  //Gelen DB durumunu normalize edip şuna eşit mi bakıyor:NAKLIYE / OLUSTURULDU
  private isJobCreated(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === CREATED_JOB_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === CREATED_JOB_STATUS.durumAdi
    );
  }

  //Gelen DB durumunu normalize edip şuna eşit mi bakıyor:NAKLIYE / BASLATILDI
  private isJobStarted(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === STARTED_JOB_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === STARTED_JOB_STATUS.durumAdi
    );
  }

  private isJobPendingDelivery(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === PENDING_DELIVERY_JOB_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === PENDING_DELIVERY_JOB_STATUS.durumAdi
    );
  }

  //Gelen DB durumunu normalize edip şuna eşit mi bakıyor:ISTEK / ANLASILDI
  private isRequestAgreed(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === AGREED_REQUEST_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === AGREED_REQUEST_STATUS.durumAdi
    );
  }

  //Liste ekranı için sade veri döner.
  private toListItemResponse(
    job: StoredJobRecord,
    audience: JobAudience
  ): JobListItemResponseDto {
    return {
      id: job.publicId,
      requestId: job.requestPublicId,
      participantSide: audience,
      baslangicSehri: job.baslangicSehri,
      varisSehri: job.varisSehri,
      anlasilanFiyat: job.anlasilanFiyat,
      aracPlaka: job.aracPlaka,
      durum: job.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimBildirimTarihi: job.teslimBildirimTarihi,
      teslimTarihi: job.teslimTarihi,
      planlananAlimTarihi: formatDateOnlyFromDate(job.planlananAlimTarihi),
      tahminiTeslimTarihi: formatDateOnlyFromDate(job.tahminiTeslimTarihi),
      counterpartyId: job.counterpartyPublicId,
      counterpartyName: job.counterpartyName,
      counterpartyUsername: job.counterpartyUsername,
    };
  }

  //detay ekranı için daha kapsamlı veri döner. Ayrıca, kullanıcının bu nakliyeyi ]
  //başlatıp başlatamayacağı veya tamamlayıp tamamlayamayacağı bilgisi de dahil edilir.
  private toDetailResponse(
    job: StoredJobDetailRecord,
    currentUser: AuthenticatedUser,
    audience: JobAudience
  ): JobDetailResponseDto {
    //Yani işi sadece o işi alan nakliyeci başlatabilir veya tamamlayabilir. 
    //Müşteri hiçbir şekilde başlatamaz veya tamamlayamaz.
    const canManageLifecycle =
      audience === "carrier" && job.carrierId === currentUser.id;

    return {
      id: job.publicId,
      requestId: job.requestPublicId,
      participantSide: audience,
      durum: job.durumAdi,
      anlasilanFiyat: job.anlasilanFiyat,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimBildirimTarihi: job.teslimBildirimTarihi,
      teslimTarihi: job.teslimTarihi,
      planlananAlimTarihi: formatDateOnlyFromDate(job.planlananAlimTarihi),
      tahminiTeslimTarihi: formatDateOnlyFromDate(job.tahminiTeslimTarihi),
      baslangicSehri: job.baslangicSehri,
      varisSehri: job.varisSehri,
      baslangicKonumMetni: job.baslangicKonumMetni,
      varisKonumMetni: job.varisKonumMetni,
      baslangicEnlem: job.baslangicEnlem,
      baslangicBoylam: job.baslangicBoylam,
      varisEnlem: job.varisEnlem,
      varisBoylam: job.varisBoylam,
      tekTasimaIstiyor: job.tekTasimaIstiyor,
      agirlikKg: job.agirlikKg,
      hacimM3: job.hacimM3,
      yukTipi: job.yukTipi,
      tasimaTarihi: job.tasimaTarihi,
      yukDetay: job.yukDetay,
      carrier: {
        id: job.carrierPublicId,
        name: job.carrierName,
        username: job.carrierUsername,
      },
      customer: {
        id: job.customerPublicId,
        name: job.customerName,
        username: job.customerUsername,
      },
      vehicle: {
        id: job.aracPublicId,
        plaka: job.aracPlaka,
        marka: job.aracMarka,
        model: job.aracModel,
        isArchived: job.aracDeletedAt !== null,
      },
      //Frontend butonları buradan yönetebilir. 
      //Örneğin, nakliyeci sadece nakliyesi "olusturuldu" durumundayken 
      //"Başlat" butonunu görebilir ve sadece "baslatildi" durumundayken 
      //"Tamamla" butonunu görebilir. Müşteri ise hiçbir zaman bu butonları 
      //görmez çünkü lifecycle işlemlerini yönetemez.
      canStart: canManageLifecycle && this.isJobCreated(job.durumTuru, job.durumAdi),
      canMarkDelivered:
        canManageLifecycle && this.isJobStarted(job.durumTuru, job.durumAdi),
      canConfirmDelivery:
        audience === "customer" &&
        job.customerId === currentUser.id &&
        this.isJobPendingDelivery(job.durumTuru, job.durumAdi),
      canComplete:
        canManageLifecycle && this.isJobStarted(job.durumTuru, job.durumAdi),
      ratingContext: buildRatingContext({
        ratings: job.ratings,
        currentUserId: currentUser.id,
        carrierId: job.carrierId,
        customerId: job.customerId,
        durumTuru: job.durumTuru,
        durumAdi: job.durumAdi,
      }),
    };
  }
}
