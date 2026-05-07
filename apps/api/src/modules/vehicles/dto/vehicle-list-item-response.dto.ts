import { VehicleCapacitySummaryResponseDto } from "./vehicle-capacity-summary-response.dto";

export class VehicleListItemResponseDto {
  id!: number;
  plaka!: string;
  marka!: string;
  model!: string;
  yil!: number;
  maksimumAgirlikKg!: number;
  maksimumHacimM3!: number | null;
  kasaTipi!: string;
  uzunlukCm!: number | null;
  genislikCm!: number | null;
  yukseklikCm!: number | null;
  capacitySummary!: VehicleCapacitySummaryResponseDto;
}
