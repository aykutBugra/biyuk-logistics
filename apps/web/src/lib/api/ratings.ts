import { apiFetch } from "./api-client";

export type SubmittedRating = {
  id: number;
  puanDegeri: number;
  yorum: string | null;
  tarih: string;
};

export type RatingContext = {
  canRateCounterparty: boolean;
  mySubmittedRating: SubmittedRating | null;
};

export type CreateRatingInput = {
  puanDegeri: number;
  yorum?: string;
};

export type RatingListItem = {
  id: number;
  jobId: number;
  requestId: number;
  puanDegeri: number;
  yorum: string | null;
  tarih: string;
  baslangicSehri: string;
  varisSehri: string;
  counterpartyId: number;
  counterpartyName: string;
  counterpartyUsername: string;
  rolBaglami: string;
};

export type MyRatingSummaryBucket = {
  averageRating: number | null;
  ratingCount: number;
};

export type MyRatingSummary = {
  asCarrier: MyRatingSummaryBucket;
  asCustomer: MyRatingSummaryBucket;
};

export function createRatingForJob(
  jobId: number,
  input: CreateRatingInput,
  accessToken: string
) {
  return apiFetch<SubmittedRating>(`/ratings/jobs/${jobId}`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getMyGivenRatings(accessToken: string) {
  return apiFetch<RatingListItem[]>("/ratings/my/given", {
    method: "GET",
    accessToken,
  });
}

export function getMyReceivedRatings(accessToken: string) {
  return apiFetch<RatingListItem[]>("/ratings/my/received", {
    method: "GET",
    accessToken,
  });
}

export function getMyRatingSummary(accessToken: string) {
  return apiFetch<MyRatingSummary>("/ratings/my/summary", {
    method: "GET",
    accessToken,
  });
}
