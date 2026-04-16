import { apiFetch } from "./api-client";

export type CreateVehicleInput = {
  marka: string;
  model: string;
  plaka: string;
  yil: number;
  kapasite: number;
};

export type VehicleListItem = {
  id: number;
  plaka: string;
  marka: string;
  model: string;
  yil: number;
  kapasite: number;
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
  input: CreateVehicleInput,
  accessToken: string
) {
  console.log("updateVehicle fonksiyonu çağrıldı. id:", id, "input:", input);
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}


export function deleteVehicle(id: number, accessToken: string) {
  return apiFetch(`/vehicles/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

