import { apiFetch } from "./api-client";
import type { LocationSelectionInput } from "./locations";
import type { RatingContext } from "./ratings";

export type CreateTransportRequestInput = {
  baslangicKonum: LocationSelectionInput;
  varisKonum: LocationSelectionInput;
  tekTasimaIstiyor: boolean;
  agirlikKg: number;
  hacimM3: number;
  yukTipi: string;
  tasimaTarihi: string;
  yukDetay: string;
};

export type UpdateTransportRequestInput = CreateTransportRequestInput;

export type TransportRequestListItem = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  yukDetay: string;
  olusturmaTarihi: string;
  durum: string;
};

export type TransportRequestDetail = TransportRequestListItem & {
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  nakliye: {
    id: number;
    carrierId: number;
    carrierName: string;
    carrierUsername: string;
    aracId: number;
    aracPlaka: string;
    anlasilanFiyat: number;
    durum: string;
    olusturmaTarihi: string;
    baslangicTarihi: string | null;
    teslimTarihi: string | null;
    ratingContext: RatingContext;
  } | null;
};

export function createTransportRequest(
  input: CreateTransportRequestInput,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>("/transport-requests", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getMyTransportRequests(accessToken: string) {
  return apiFetch<TransportRequestListItem[]>("/transport-requests/my", {
    method: "GET",
    accessToken,
  });
}

export function getTransportRequestDetail(id: number, accessToken: string) {
  return apiFetch<TransportRequestDetail>(`/transport-requests/${id}`, {
    method: "GET",
    accessToken,
  });
}

export function updateTransportRequest(
  id: number,
  input: UpdateTransportRequestInput,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>(`/transport-requests/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deleteTransportRequest(id: number, accessToken: string) {
  return apiFetch<void>(`/transport-requests/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
