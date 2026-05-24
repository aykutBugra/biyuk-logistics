import { RequestImageResponseDto } from "../../../common/dto/request-image-response.dto";
import { TransportRequestListItemResponseDto } from "./transport-request-list-item-response.dto";
import { TransportRequestJobSummaryResponseDto } from "./transport-request-job-summary-response.dto";

export class TransportRequestDetailResponseDto extends TransportRequestListItemResponseDto {
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
  nakliye!: TransportRequestJobSummaryResponseDto | null;
  images?: RequestImageResponseDto[];
  primaryImageId?: string | null;
}
