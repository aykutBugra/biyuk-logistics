import { apiFetch } from "./api-client";

export type CreateVehicleInput = {
  marka: string;
  model: string;
  plaka: string;
  yil: number;
  maksimumAgirlikKg: number;
  maksimumHacimM3: number;
  kasaTipi: string;
  uzunlukCm?: number;
  genislikCm?: number;
  yukseklikCm?: number;
};

export type UpdateVehicleInput = CreateVehicleInput;

export type VehicleListItem = {
  id: number;
  plaka: string;
  marka: string;
  model: string;
  yil: number;
  maksimumAgirlikKg: number;
  maksimumHacimM3: number | null;
  kasaTipi: string | null;
  uzunlukCm: number | null;
  genislikCm: number | null;
  yukseklikCm: number | null;
};

export type VehicleDetail = VehicleListItem;

export function createVehicle(input: CreateVehicleInput, accessToken: string) {
  return apiFetch<VehicleDetail>("/vehicles", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getMyVehicles(accessToken: string) {
  return apiFetch<VehicleListItem[]>("/vehicles/my", {
    method: "GET",
    accessToken,
  });
}

export function getVehicleDetail(id: number, accessToken: string) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, {
    method: "GET",
    accessToken,
  });
}

export function updateVehicle(
  id: number,
  input: UpdateVehicleInput,
  accessToken: string
) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deleteVehicle(id: number, accessToken: string) {
  return apiFetch<void>(`/vehicles/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
