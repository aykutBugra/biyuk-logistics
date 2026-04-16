import { apiFetch } from "./api-client";

export type CreateTransportRequestInput = {
  baslangicSehri: string;
  varisSehri: string;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  yukDetay: string;
};

export type TransportRequestListItem = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  yukDetay: string;
  olusturmaTarihi: string;
  durum: string;
};

export type TransportRequestDetail = TransportRequestListItem & {
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
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
