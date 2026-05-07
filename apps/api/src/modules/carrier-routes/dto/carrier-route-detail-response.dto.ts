import { CarrierRouteListItemResponseDto } from "./carrier-route-list-item-response.dto";

export class CarrierRouteDetailResponseDto extends CarrierRouteListItemResponseDto {
  baslangicProvider!: string | null;
  varisProvider!: string | null;
  baslangicPlaceId!: string | null;
  varisPlaceId!: string | null;
  normalizeBaslangicSehir!: string | null;
  normalizeVarisSehir!: string | null;
  normalizeBaslangicIlce!: string | null;
  normalizeVarisIlce!: string | null;
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
}
