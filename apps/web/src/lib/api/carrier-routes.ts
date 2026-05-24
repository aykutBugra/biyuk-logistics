import type { LocationSelectionInput } from "./locations";
import { apiFetch } from "./api-client";

export type CreateCarrierRouteInput = {
  baslangicKonum: LocationSelectionInput;
  varisKonum: LocationSelectionInput;
  planlananTarih: string;
};

export type UpdateCarrierRouteInput = CreateCarrierRouteInput;

export type CarrierRouteListItem = {
  id: string;
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

// Nakliyeci yeni hat/rota olustururken secilen iki canonical konum backend'e gider.
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

// Nakliyecinin kendi tanimli rotalarini liste ekraninda kullanmak icin ceker.
export function getMyCarrierRoutes(accessToken: string) {
  return apiFetch<CarrierRouteListItem[]>("/carrier-routes/my", {
    method: "GET",
    accessToken,
  });
}

// Detay ve duzenleme ekranlari tek rota kaydinin tum koordinat bilgilerini ister.
export function getCarrierRouteDetail(id: string, accessToken: string) {
  return apiFetch<CarrierRouteDetail>(`/carrier-routes/my/${id}`, {
    method: "GET",
    accessToken,
  });
}

// Rota guncelleme create ile ayni input seklini kullanir.
export function updateCarrierRoute(
  id: string,
  input: UpdateCarrierRouteInput,
  accessToken: string
) {
  return apiFetch<CarrierRouteDetail>(`/carrier-routes/my/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Sadece kullanicinin kendi rotasi backend sahiplik kontrolunden gecerse silinir.
export function deleteCarrierRoute(id: string, accessToken: string) {
  return apiFetch<void>(`/carrier-routes/my/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
