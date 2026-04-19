import { TransportRequestListItemResponseDto } from "./transport-request-list-item-response.dto";
import { TransportRequestJobSummaryResponseDto } from "./transport-request-job-summary-response.dto";

export class TransportRequestDetailResponseDto extends TransportRequestListItemResponseDto {
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
  nakliye!: TransportRequestJobSummaryResponseDto | null;
}
