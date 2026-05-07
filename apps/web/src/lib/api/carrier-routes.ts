import type { LocationSelectionInput } from "./locations";
import { apiFetch } from "./api-client";

export type CreateCarrierRouteInput = {
  baslangicKonum: LocationSelectionInput;
  varisKonum: LocationSelectionInput;
  planlananTarih: string;
  maksimumSapmaKm?: number;
};

export type UpdateCarrierRouteInput = CreateCarrierRouteInput;

export type CarrierRouteListItem = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
  planlananTarih: string;
  maksimumSapmaKm: number | null;
  olusturmaTarihi: string;
};

export type CarrierRouteDetail = CarrierRouteListItem & {
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
};

export function createCarrierRoute(
  input: CreateCarrierRouteInput,
  accessToken: string
) {
  return apiFetch<CarrierRouteDetail>("/carrier-routes", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getMyCarrierRoutes(accessToken: string) {
  return apiFetch<CarrierRouteListItem[]>("/carrier-routes/my", {
    method: "GET",
    accessToken,
  });
}

export function getCarrierRouteDetail(id: number, accessToken: string) {
  return apiFetch<CarrierRouteDetail>(`/carrier-routes/my/${id}`, {
    method: "GET",
    accessToken,
  });
}

export function updateCarrierRoute(
  id: number,
  input: UpdateCarrierRouteInput,
  accessToken: string
) {
  return apiFetch<CarrierRouteDetail>(`/carrier-routes/my/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deleteCarrierRoute(id: number, accessToken: string) {
  return apiFetch<void>(`/carrier-routes/my/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
