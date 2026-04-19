import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JobDetailResponseDto } from "./dto/job-detail-response.dto";
import { JobListItemResponseDto } from "./dto/job-list-item-response.dto";
import {
  JobsRepository,
  type StoredJobDetailRecord,
  type StoredJobRecord,
} from "./repositories/jobs.repository";
import { buildRatingContext } from "../ratings/rating-context.helpers";

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
  constructor(private readonly jobsRepository: JobsRepository) {}

  async getMine(currentUser: AuthenticatedUser): Promise<JobListItemResponseDto[]> {
    if (this.isCarrier(currentUser)) {
      const jobs = await this.jobsRepository.findManyByCarrierId(currentUser.id);
      return jobs.map((job) => this.toListItemResponse(job));
    }

    if (this.isCustomer(currentUser)) {
      const jobs = await this.jobsRepository.findManyByCustomerId(currentUser.id);
      return jobs.map((job) => this.toListItemResponse(job));
    }

    throw new ForbiddenException("Only customers and carriers can access jobs.");
  }

  async getById(
    currentUser: AuthenticatedUser,
    jobId: number
  ): Promise<JobDetailResponseDto> {
    const job = await this.findReadableJob(currentUser, jobId);

    return this.toDetailResponse(job, currentUser);
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

    return this.toDetailResponse(updatedJob, currentUser);
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

    const result = await this.jobsRepository.completeByIdAndCarrierId({
      jobId,
      carrierId: currentUser.id,
      requestId: job.requestId,
      startedStatusId,
      completedJobStatusId,
      agreedRequestStatusId,
      completedRequestStatusId,
    });

    if (!result.ok) {
      throw new ConflictException(
        result.reason === "request_not_agreed"
          ? "Shipment can no longer be completed because the related request is no longer in an agreed state."
          : "Shipment can no longer be completed."
      );
    }

    const updatedJob = await this.jobsRepository.findByIdAndCarrierId(
      jobId,
      currentUser.id
    );

    if (!updatedJob) {
      throw new NotFoundException("Shipment not found.");
    }

    return this.toDetailResponse(updatedJob, currentUser);
  }

  private async findReadableJob(
    currentUser: AuthenticatedUser,
    jobId: number
  ): Promise<StoredJobDetailRecord> {
    if (this.isCarrier(currentUser)) {
      const job = await this.jobsRepository.findByIdAndCarrierId(jobId, currentUser.id);

      if (!job) {
        throw new NotFoundException("Shipment not found.");
      }

      return job;
    }

    if (this.isCustomer(currentUser)) {
      const job = await this.jobsRepository.findByIdAndCustomerId(jobId, currentUser.id);

      if (!job) {
        throw new NotFoundException("Shipment not found.");
      }

      return job;
    }

    throw new ForbiddenException("Only customers and carriers can access jobs.");
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

  private toListItemResponse(job: StoredJobRecord): JobListItemResponseDto {
    return {
      id: job.id,
      requestId: job.requestId,
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
    currentUser: AuthenticatedUser
  ): JobDetailResponseDto {
    const canManageLifecycle = this.isCarrier(currentUser) && job.carrierId === currentUser.id;

    return {
      id: job.id,
      requestId: job.requestId,
      durum: job.durumAdi,
      anlasilanFiyat: job.anlasilanFiyat,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
      baslangicSehri: job.baslangicSehri,
      varisSehri: job.varisSehri,
      baslangicEnlem: job.baslangicEnlem,
      baslangicBoylam: job.baslangicBoylam,
      varisEnlem: job.varisEnlem,
      varisBoylam: job.varisBoylam,
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
