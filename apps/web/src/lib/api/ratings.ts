import { apiFetch } from "./api-client";

export type SubmittedRating = {
  id: string;
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
  id: string;
  jobId: string;
  requestId: string;
  puanDegeri: number;
  yorum: string | null;
  tarih: string;
  baslangicSehri: string;
  varisSehri: string;
  counterpartyId: string;
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

// Tamamlanan bir nakliye sonrasinda karsi tarafa puan ve opsiyonel yorum gonderir.
export function createRatingForJob(
  jobId: string,
  input: CreateRatingInput,
  accessToken: string
) {
  return apiFetch<SubmittedRating>(`/ratings/jobs/${jobId}`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Kullanici tarafindan verilen puanlari Puanlarim ekraninda listeler.
export function getMyGivenRatings(accessToken: string) {
  return apiFetch<RatingListItem[]>("/ratings/my/given", {
    method: "GET",
    accessToken,
  });
}

// Kullanicinin aldigi puanlar roluyle beraber profil/puan ekraninda gosterilir.
export function getMyReceivedRatings(accessToken: string) {
  return apiFetch<RatingListItem[]>("/ratings/my/received", {
    method: "GET",
    accessToken,
  });
}

// Ortalama puanlar musteri ve nakliyeci rolleri icin ayri bucket olarak gelir.
export function getMyRatingSummary(accessToken: string) {
  return apiFetch<MyRatingSummary>("/ratings/my/summary", {
    method: "GET",
    accessToken,
  });
}
