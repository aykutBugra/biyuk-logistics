import { ROLE_NAMES } from "../../common/constants/role-names";
import { RatingContextResponseDto } from "./dto/rating-context-response.dto";
import { SubmittedRatingResponseDto } from "./dto/submitted-rating-response.dto";

const COMPLETED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TAMAMLANDI",
} as const;

export type StoredSubmittedRatingRecord = {
  id: number;
  publicId: string;
  puanlayanId: number;
  puanlananId: number;
  puanDegeri: number;
  yorum: string | null;
  tarih: Date;
};

type BuildRatingContextInput = {
  ratings: StoredSubmittedRatingRecord[];
  currentUserId: number;
  carrierId: number;
  customerId: number;
  durumTuru: string;
  durumAdi: string;
};

function isCompletedShipment(durumTuru: string, durumAdi: string): boolean {
  return (
    durumTuru.trim().toUpperCase() === COMPLETED_JOB_STATUS.durumTuru &&
    durumAdi.trim().toUpperCase() === COMPLETED_JOB_STATUS.durumAdi
  );
}

export function toSubmittedRatingResponse(
  rating: Pick<
    StoredSubmittedRatingRecord,
    "publicId" | "puanDegeri" | "yorum" | "tarih"
  >
): SubmittedRatingResponseDto {
  return {
    id: rating.publicId,
    puanDegeri: rating.puanDegeri,
    yorum: rating.yorum,
    tarih: rating.tarih,
  };
}

export function buildRatingContext(
  input: BuildRatingContextInput
): RatingContextResponseDto {
  const isParticipant =
    input.currentUserId === input.customerId || input.currentUserId === input.carrierId;
  const counterpartyId =
    input.currentUserId === input.customerId
      ? input.carrierId
      : input.currentUserId === input.carrierId
        ? input.customerId
        : null;

  const mySubmittedRating =
    counterpartyId === null
      ? null
      : input.ratings.find(
          (rating) =>
            rating.puanlayanId === input.currentUserId &&
            rating.puanlananId === counterpartyId
        ) ?? null;

  return {
    canRateCounterparty:
      isParticipant &&
      counterpartyId !== null &&
      counterpartyId !== input.currentUserId &&
      isCompletedShipment(input.durumTuru, input.durumAdi) &&
      mySubmittedRating === null,
    mySubmittedRating: mySubmittedRating
      ? toSubmittedRatingResponse(mySubmittedRating)
      : null,
  };
}

export function getRatedUserRoleContext(
  carrierId: number,
  ratedUserId: number
): string {
  return carrierId === ratedUserId ? ROLE_NAMES.NAKLIYECI : ROLE_NAMES.MUSTERI;
}
