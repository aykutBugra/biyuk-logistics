import { RatingContextResponseDto } from "../../ratings/dto/rating-context-response.dto";

export class JobDetailResponseDto {
  id!: number;
  requestId!: number;
  durum!: string;
  anlasilanFiyat!: number;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimTarihi!: Date | null;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
  yukDetay!: string;
  carrier!: {
    id: number;
    name: string;
    username: string;
  };
  customer!: {
    id: number;
    name: string;
    username: string;
  };
  vehicle!: {
    id: number;
    plaka: string;
    marka: string;
    model: string;
    isArchived: boolean;
  };
  canStart!: boolean;
  canComplete!: boolean;
  ratingContext!: RatingContextResponseDto;
}
