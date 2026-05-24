import { RatingContextResponseDto } from "../../ratings/dto/rating-context-response.dto";

export class TransportRequestJobSummaryResponseDto {
  id!: string;
  carrierId!: string;
  carrierName!: string;
  carrierUsername!: string;
  aracId!: string;
  aracPlaka!: string;
  anlasilanFiyat!: number;
  durum!: string;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimBildirimTarihi!: Date | null;
  teslimTarihi!: Date | null;
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
  canConfirmDelivery!: boolean;
  ratingContext!: RatingContextResponseDto;
}
