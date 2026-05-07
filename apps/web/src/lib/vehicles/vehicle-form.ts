import type { CreateVehicleInput } from "@/lib/api/vehicles";

export type VehicleFormState = {
  marka: string;
  model: string;
  plaka: string;
  yil: string;
  maksimumAgirlikKg: string;
  maksimumHacimM3: string;
  kasaTipi: string;
  uzunlukCm: string;
  genislikCm: string;
  yukseklikCm: string;
};

export const initialVehicleFormState: VehicleFormState = {
  marka: "",
  model: "",
  plaka: "",
  yil: "",
  maksimumAgirlikKg: "",
  maksimumHacimM3: "",
  kasaTipi: "DIGER",
  uzunlukCm: "",
  genislikCm: "",
  yukseklikCm: "",
};

export function toCreateVehicleInput(values: VehicleFormState): CreateVehicleInput {
  return {
    marka: values.marka,
    model: values.model,
    plaka: values.plaka,
    yil: Number(values.yil),
    maksimumAgirlikKg: Number(values.maksimumAgirlikKg),
    maksimumHacimM3: Number(values.maksimumHacimM3),
    kasaTipi: values.kasaTipi,
    uzunlukCm: values.uzunlukCm ? Number(values.uzunlukCm) : undefined,
    genislikCm: values.genislikCm ? Number(values.genislikCm) : undefined,
    yukseklikCm: values.yukseklikCm ? Number(values.yukseklikCm) : undefined,
  };
}
