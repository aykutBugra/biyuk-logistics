import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { NotificationsPublisher } from "../notifications/notifications.publisher";
import { CreateRatingDto } from "./dto/create-rating.dto";
import { MyRatingSummaryResponseDto } from "./dto/my-rating-summary-response.dto";
import { RatingListItemResponseDto } from "./dto/rating-list-item-response.dto";
import { SubmittedRatingResponseDto } from "./dto/submitted-rating-response.dto";
import {
  type StoredRateableJobRecord,
  type StoredRatingListRecord,
  RatingsRepository,
} from "./repositories/ratings.repository";
import { toSubmittedRatingResponse } from "./rating-context.helpers";

const COMPLETED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TAMAMLANDI",
} as const;

const RATING_TYPE = "SAYISAL_1_5";

@Injectable()
export class RatingsService {
  constructor(
    private readonly ratingsRepository: RatingsRepository,
    private readonly notificationsPublisher: NotificationsPublisher
  ) {}

  async createForJob(
    currentUser: AuthenticatedUser,
    jobId: number,
    createRatingDto: CreateRatingDto
  ): Promise<SubmittedRatingResponseDto> {
    const job = await this.ratingsRepository.findRateableJobByIdAndParticipant(
      jobId,
      currentUser.id
    );

    if (!job) {
      throw new NotFoundException("Shipment not found.");
    }

    if (!this.isCompletedJob(job)) {
      throw new ConflictException("Completed shipment rating is not available yet.");
    }

    const ratedUserId = this.resolveRatedUserId(job, currentUser.id);

    if (ratedUserId === null) {
      throw new NotFoundException("Shipment not found.");
    }

    if (ratedUserId === currentUser.id) {
      throw new ConflictException("Self rating is not allowed.");
    }

    const existingRating = job.ratings.find(
      (rating) =>
        rating.puanlayanId === currentUser.id && rating.puanlananId === ratedUserId
    );

    if (existingRating) {
      throw new ConflictException("You have already rated this completed shipment.");
    }

    const ratingTypeId = await this.requireRatingTypeId();

    try {
      const rating = await this.ratingsRepository.create({
        nakliyeId: job.id,
        puanlayanId: currentUser.id,
        puanlananId: ratedUserId,
        puanTanimId: ratingTypeId,
        puanDegeri: createRatingDto.puanDegeri,
        yorum: createRatingDto.yorum,
      });

      await this.notificationsPublisher.publishRatingReceived({
        ratedUserId,
        ratingId: rating.id,
        jobId: job.id,
        puanDegeri: rating.puanDegeri,
        actorUserId: currentUser.id,
      });

      return toSubmittedRatingResponse(rating);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("You have already rated this completed shipment.");
      }

      throw error;
    }
  }

  async getMyGiven(currentUser: AuthenticatedUser): Promise<RatingListItemResponseDto[]> {
    const ratings = await this.ratingsRepository.findManyGivenByUserId(currentUser.id);
    return ratings.map((rating) => this.toGivenListItemResponse(rating));
  }

  async getMyReceived(
    currentUser: AuthenticatedUser
  ): Promise<RatingListItemResponseDto[]> {
    const ratings = await this.ratingsRepository.findManyReceivedByUserId(currentUser.id);
    return ratings.map((rating) => this.toReceivedListItemResponse(rating));
  }

  async getMySummary(
    currentUser: AuthenticatedUser
  ): Promise<MyRatingSummaryResponseDto> {
    return this.ratingsRepository.getReceivedSummaryByUserId(currentUser.id);
  }

  private async requireRatingTypeId(): Promise<number> {
    const ratingTypeId = await this.ratingsRepository.findRatingTypeIdByType(RATING_TYPE);

    if (ratingTypeId !== null) {
      return ratingTypeId;
    }

    throw new InternalServerErrorException(
      `Rating scheme is not configured: ${RATING_TYPE}.`
    );
  }

  private isCompletedJob(job: StoredRateableJobRecord): boolean {
    return (
      job.durumTuru.trim().toUpperCase() === COMPLETED_JOB_STATUS.durumTuru &&
      job.durumAdi.trim().toUpperCase() === COMPLETED_JOB_STATUS.durumAdi
    );
  }

  private resolveRatedUserId(
    job: StoredRateableJobRecord,
    currentUserId: number
  ): number | null {
    if (currentUserId === job.customerId) {
      return job.carrierId;
    }

    if (currentUserId === job.carrierId) {
      return job.customerId;
    }

    return null;
  }

  private toGivenListItemResponse(
    rating: StoredRatingListRecord
  ): RatingListItemResponseDto {
    return {
      id: rating.id,
      jobId: rating.jobId,
      requestId: rating.requestId,
      puanDegeri: rating.puanDegeri,
      yorum: rating.yorum,
      tarih: rating.tarih,
      baslangicSehri: rating.baslangicSehri,
      varisSehri: rating.varisSehri,
      counterpartyId: rating.puanlananId,
      counterpartyName: rating.puanlananName,
      counterpartyUsername: rating.puanlananUsername,
      rolBaglami: rating.rolBaglami,
    };
  }

  private toReceivedListItemResponse(
    rating: StoredRatingListRecord
  ): RatingListItemResponseDto {
    return {
      id: rating.id,
      jobId: rating.jobId,
      requestId: rating.requestId,
      puanDegeri: rating.puanDegeri,
      yorum: rating.yorum,
      tarih: rating.tarih,
      baslangicSehri: rating.baslangicSehri,
      varisSehri: rating.varisSehri,
      counterpartyId: rating.puanlayanId,
      counterpartyName: rating.puanlayanName,
      counterpartyUsername: rating.puanlayanUsername,
      rolBaglami: rating.rolBaglami,
    };
  }
}
