import { RatingContextResponseDto } from "../../ratings/dto/rating-context-response.dto";

export class TransportRequestJobSummaryResponseDto {
  id!: number;
  carrierId!: number;
  carrierName!: string;
  carrierUsername!: string;
  aracId!: number;
  aracPlaka!: string;
  anlasilanFiyat!: number;
  durum!: string;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimTarihi!: Date | null;
  ratingContext!: RatingContextResponseDto;
}
