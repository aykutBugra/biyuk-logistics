import { apiFetch } from "./api-client";

export type OpenOfferRequestListItem = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  yukDetay: string;
  olusturmaTarihi: string;
  durum: string;
  alreadyOffered: boolean;
};

export type OpenOfferRequestDetail = OpenOfferRequestListItem & {
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  hasActiveVehicle: boolean;
  hasExistingOffer: boolean;
};

export type CreateOfferInput = {
  aracId: number;
  fiyat: number;
  not?: string;
};

export type OfferItem = {
  id: number;
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

export type IncomingOfferItem = {
  id: number;
  requestId: number;
  carrierId: number;
  carrierName: string;
  carrierUsername: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

export function getOpenOfferRequests(accessToken: string) {
  return apiFetch<OpenOfferRequestListItem[]>("/offers/open-requests", {
    method: "GET",
    accessToken,
  });
}

export function getOpenOfferRequestDetail(requestId: number, accessToken: string) {
  return apiFetch<OpenOfferRequestDetail>(`/offers/open-requests/${requestId}`, {
    method: "GET",
    accessToken,
  });
}

export function createOffer(
  requestId: number,
  input: CreateOfferInput,
  accessToken: string
) {
  return apiFetch<OfferItem>(`/offers/requests/${requestId}`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getMyOffers(accessToken: string) {
  return apiFetch<OfferItem[]>("/offers/my", {
    method: "GET",
    accessToken,
  });
}

export function getIncomingOffersForRequest(requestId: number, accessToken: string) {
  return apiFetch<IncomingOfferItem[]>(`/offers/requests/${requestId}/incoming`, {
    method: "GET",
    accessToken,
  });
}

export function acceptOffer(offerId: number, accessToken: string) {
  return apiFetch<void>(`/offers/${offerId}/accept`, {
    method: "POST",
    accessToken,
  });
}

export function rejectOffer(offerId: number, accessToken: string) {
  return apiFetch<void>(`/offers/${offerId}/reject`, {
    method: "POST",
    accessToken,
  });
}
