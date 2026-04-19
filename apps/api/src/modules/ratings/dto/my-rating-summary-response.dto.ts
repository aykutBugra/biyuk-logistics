import { MyRatingSummaryBucketResponseDto } from "./my-rating-summary-bucket-response.dto";

export class MyRatingSummaryResponseDto {
  asCarrier!: MyRatingSummaryBucketResponseDto;
  asCustomer!: MyRatingSummaryBucketResponseDto;
}
