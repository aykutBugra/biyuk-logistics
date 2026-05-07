import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { unwrapTransactionResult } from "../../common/utils/unwrap-transaction-result";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../notifications/notifications.publisher";
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

const CREATED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "OLUSTURULDU",
} as const;

const STARTED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "BASLATILDI",
} as const;

const COMPLETED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TAMAMLANDI",
} as const;

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
    private readonly jobsRepository: JobsRepository,
    private readonly notificationsPublisher: NotificationsPublisher,
    private readonly vehicleCapacityService: VehicleCapacityService,
    private readonly prisma: PrismaService
  ) {}

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

  async getById(
    currentUser: AuthenticatedUser,
    jobId: number,
    query: JobAudienceQueryDto
  ): Promise<JobDetailResponseDto> {
    const audience = this.resolveAudience(currentUser, query.as);
    const job = await this.findReadableJob(currentUser, jobId, audience);

    return this.toDetailResponse(job, currentUser, audience);
  }

  async startById(
    currentUser: AuthenticatedUser,
    jobId: number
  ): Promise<JobDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);

    if (!job) {
      throw new NotFoundException("Shipment not found.");
    }

    this.assertDistinctShipmentParticipants(job);

    if (!this.isJobCreated(job.durumTuru, job.durumAdi)) {
      throw new ConflictException("Shipment can no longer be started.");
    }

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

    const wasStarted = await this.jobsRepository.startByIdAndCarrierId(
      jobId,
      currentUser.id,
      createdStatusId,
      startedStatusId
    );

    if (!wasStarted) {
      throw new ConflictException("Shipment can no longer be started.");
    }

    const updatedJob = await this.jobsRepository.findByIdAndCarrierId(
      jobId,
      currentUser.id
    );

    if (!updatedJob) {
      throw new NotFoundException("Shipment not found.");
    }

    await this.notificationsPublisher.publishJobStarted({
      customerId: updatedJob.customerId,
      jobId: updatedJob.id,
      requestId: updatedJob.requestId,
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
    jobId: number
  ): Promise<JobDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);

    if (!job) {
      throw new NotFoundException("Shipment not found.");
    }

    this.assertDistinctShipmentParticipants(job);

    if (!this.isJobStarted(job.durumTuru, job.durumAdi)) {
      throw new ConflictException("Shipment can no longer be completed.");
    }

    if (!this.isRequestAgreed(job.requestStatusTuru, job.requestStatusAdi)) {
      throw new ConflictException("Shipment can no longer be completed.");
    }

    const [
      startedStatusId,
      completedJobStatusId,
      agreedRequestStatusId,
      completedRequestStatusId,
    ] = await Promise.all([
      this.requireStatusId(
        STARTED_JOB_STATUS.durumTuru,
        STARTED_JOB_STATUS.durumAdi,
        "Shipment started status"
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

    await this.prisma.client.$transaction(async (tx) => {
      unwrapTransactionResult(
        await this.jobsRepository.completeByIdAndCarrierIdInTransaction(tx, {
          jobId,
          carrierId: currentUser.id,
          requestId: job.requestId,
          startedStatusId,
          completedJobStatusId,
          agreedRequestStatusId,
          completedRequestStatusId,
        }),
        (reason) =>
          new ConflictException(
            reason === "request_not_agreed"
              ? "Shipment can no longer be completed because the related request is no longer in an agreed state."
              : "Shipment can no longer be completed."
          )
      );

      await this.vehicleCapacityService.releaseReservationByShipmentId(
        jobId,
        VEHICLE_CAPACITY_RELEASE_REASONS.COMPLETED,
        tx
      );
    });

    const updatedJob = await this.jobsRepository.findByIdAndCarrierId(
      jobId,
      currentUser.id
    );

    if (!updatedJob) {
      throw new NotFoundException("Shipment not found.");
    }

    await Promise.all([
      this.notificationsPublisher.publishJobCompleted({
        customerId: updatedJob.customerId,
        jobId: updatedJob.id,
        requestId: updatedJob.requestId,
        actorUserId: currentUser.id,
        route: {
          baslangicSehri: updatedJob.baslangicSehri,
          varisSehri: updatedJob.varisSehri,
        },
      }),
      this.notificationsPublisher.publishRatingPending({
        userId: updatedJob.carrierId,
        jobId: updatedJob.id,
        actorUserId: currentUser.id,
      }),
    ]);

    return this.toDetailResponse(updatedJob, currentUser, "carrier");
  }

  private async findReadableJob(
    currentUser: AuthenticatedUser,
    jobId: number,
    audience: JobAudience
  ): Promise<StoredJobDetailRecord> {
    if (audience === "carrier") {
      const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);

      if (!job) {
        throw new NotFoundException("Shipment not found.");
      }

      return job;
    }

    const job = await this.jobsRepository.findByIdAndCustomerId(jobId, currentUser.id);

    if (!job) {
      throw new NotFoundException("Shipment not found.");
    }

    return job;
  }

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

    throw new InternalServerErrorException(
      `${label} is not configured: ${durumTuru}/${durumAdi}.`
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

    throw new ForbiddenException("Only carriers can manage shipment lifecycle.");
  }

  private resolveAudience(
    currentUser: AuthenticatedUser,
    requestedAudience?: JobAudience
  ): JobAudience {
    const hasCarrierRole = this.isCarrier(currentUser);
    const hasCustomerRole = this.isCustomer(currentUser);

    if (!hasCarrierRole && !hasCustomerRole) {
      throw new ForbiddenException("Only customers and carriers can access jobs.");
    }

    if (requestedAudience === "carrier") {
      if (!hasCarrierRole) {
        throw new ForbiddenException("Carrier context is not available for the current user.");
      }

      return requestedAudience;
    }

    if (requestedAudience === "customer") {
      if (!hasCustomerRole) {
        throw new ForbiddenException("Customer context is not available for the current user.");
      }

      return requestedAudience;
    }

    if (hasCarrierRole && hasCustomerRole) {
      throw new ConflictException(
        "Dual-role users must specify ?as=customer or ?as=carrier for job reads."
      );
    }

    return hasCarrierRole ? "carrier" : "customer";
  }

  private assertDistinctShipmentParticipants(
    job: Pick<StoredJobDetailRecord, "carrierId" | "customerId">
  ) {
    if (job.carrierId !== job.customerId) {
      return;
    }

    throw new ConflictException(
      "Shipment lifecycle is blocked because the carrier and customer resolve to the same user."
    );
  }

  private isJobCreated(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === CREATED_JOB_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === CREATED_JOB_STATUS.durumAdi
    );
  }

  private isJobStarted(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === STARTED_JOB_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === STARTED_JOB_STATUS.durumAdi
    );
  }

  private isRequestAgreed(durumTuru: string, durumAdi: string): boolean {
    return (
      durumTuru.trim().toUpperCase() === AGREED_REQUEST_STATUS.durumTuru &&
      durumAdi.trim().toUpperCase() === AGREED_REQUEST_STATUS.durumAdi
    );
  }

  private toListItemResponse(
    job: StoredJobRecord,
    audience: JobAudience
  ): JobListItemResponseDto {
    return {
      id: job.id,
      requestId: job.requestId,
      participantSide: audience,
      baslangicSehri: job.baslangicSehri,
      varisSehri: job.varisSehri,
      anlasilanFiyat: job.anlasilanFiyat,
      aracPlaka: job.aracPlaka,
      durum: job.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
      counterpartyId: job.counterpartyId,
      counterpartyName: job.counterpartyName,
      counterpartyUsername: job.counterpartyUsername,
    };
  }

  private toDetailResponse(
    job: StoredJobDetailRecord,
    currentUser: AuthenticatedUser,
    audience: JobAudience
  ): JobDetailResponseDto {
    const canManageLifecycle =
      audience === "carrier" && job.carrierId === currentUser.id;

    return {
      id: job.id,
      requestId: job.requestId,
      participantSide: audience,
      durum: job.durumAdi,
      anlasilanFiyat: job.anlasilanFiyat,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
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
        id: job.carrierId,
        name: job.carrierName,
        username: job.carrierUsername,
      },
      customer: {
        id: job.customerId,
        name: job.customerName,
        username: job.customerUsername,
      },
      vehicle: {
        id: job.aracId,
        plaka: job.aracPlaka,
        marka: job.aracMarka,
        model: job.aracModel,
        isArchived: job.aracDeletedAt !== null,
      },
      canStart: canManageLifecycle && this.isJobCreated(job.durumTuru, job.durumAdi),
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
