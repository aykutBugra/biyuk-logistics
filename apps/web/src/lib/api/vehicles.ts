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

export type VehicleCapacitySummary = {
  toplamAgirlikKg: number;
  toplamHacimM3: number | null;
  rezerveAgirlikKg: number;
  rezerveHacimM3: number;
  kalanAgirlikKg: number;
  kalanHacimM3: number | null;
  aktifRezervasyonSayisi: number;
  aktifTekTasimaRezervasyonuVar: boolean;
  hesapEksigiVar: boolean;
};

export type VehicleListItem = {
  id: string;
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
  vehicleImageUrl?: string;
  capacitySummary: VehicleCapacitySummary;
};

export type VehicleDetail = VehicleListItem;

// Nakliyeci arac eklerken formdaki sayisal alanlar create input olarak backend'e gider.
export function createVehicle(input: CreateVehicleInput, accessToken: string) {
  return apiFetch<VehicleDetail>("/vehicles", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Araclarim ekraninda kullanicinin aktif arac filosu ve kapasite ozeti listelenir.
export function getMyVehicles(accessToken: string) {
  return apiFetch<VehicleListItem[]>("/vehicles/my", {
    method: "GET",
    accessToken,
  });
}

// Detay/duzenleme ekranlari tek aracin tum kapasite bilgisini bu endpoint'ten alir.
export function getVehicleDetail(id: string, accessToken: string) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, {
    method: "GET",
    accessToken,
  });
}

// Arac bilgilerinin guncellenmesi sahiplik kontroluyle backend tarafinda yapilir.
export function updateVehicle(
  id: string,
  input: UpdateVehicleInput,
  accessToken: string
) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Silme islemi UI'da tek istek gibi gorunur, backend uygunluk ve sahiplik kontrol eder.
export function deleteVehicle(id: string, accessToken: string) {
  return apiFetch<void>(`/vehicles/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

// Arac fotografi FormData ile gonderilir; JSON content-type api client tarafindan eklenmez.
export function uploadVehicleImage(
  id: string,
  formData: FormData,
  accessToken: string
) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}/image`, {
    method: "POST",
    accessToken,
    body: formData,
  });
}

// Arac fotografini kaldirinca detay response'u guncel haliyle geri gelir.
export function deleteVehicleImage(id: string, accessToken: string) {
  return apiFetch<VehicleDetail>(`/vehicles/${id}/image`, {
    method: "DELETE",
    accessToken,
  });
}
