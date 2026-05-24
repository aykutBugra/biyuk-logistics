import { RatingContextResponseDto } from "../../ratings/dto/rating-context-response.dto";

export class JobDetailResponseDto {
  id!: string;
  requestId!: string;
  participantSide!: "customer" | "carrier";
  durum!: string;
  anlasilanFiyat!: number;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimBildirimTarihi!: Date | null;
  teslimTarihi!: Date | null;
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
  tekTasimaIstiyor!: boolean;
  agirlikKg!: number | null;
  hacimM3!: number | null;
  yukTipi!: string;
  tasimaTarihi!: string | null;
  yukDetay!: string;
  carrier!: {
    id: string;
    name: string;
    username: string;
  };
  customer!: {
    id: string;
    name: string;
    username: string;
  };
  vehicle!: {
    id: string;
    plaka: string;
    marka: string;
    model: string;
    isArchived: boolean;
  };
  canStart!: boolean;
  canMarkDelivered!: boolean;
  canConfirmDelivery!: boolean;
  canComplete!: boolean;
  ratingContext!: RatingContextResponseDto;
}
