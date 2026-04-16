import { TransportRequestListItemResponseDto } from "./transport-request-list-item-response.dto";

export class TransportRequestDetailResponseDto extends TransportRequestListItemResponseDto {
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
}
