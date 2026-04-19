import { SubmittedRatingResponseDto } from "./submitted-rating-response.dto";

export class RatingContextResponseDto {
  canRateCounterparty!: boolean;
  mySubmittedRating!: SubmittedRatingResponseDto | null;
}
