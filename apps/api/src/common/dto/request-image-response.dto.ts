import { RequestImageSummaryResponseDto } from "./request-image-summary-response.dto";

export class RequestImageResponseDto extends RequestImageSummaryResponseDto {
  url!: string;
  isPrimary!: boolean;
}
