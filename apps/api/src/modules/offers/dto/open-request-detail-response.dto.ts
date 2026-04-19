import { OpenRequestListItemResponseDto } from "./open-request-list-item-response.dto";

export class OpenRequestDetailResponseDto extends OpenRequestListItemResponseDto {
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
  hasActiveVehicle!: boolean;
  hasExistingOffer!: boolean;
}
