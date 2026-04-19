export class RatingListItemResponseDto {
  id!: number;
  jobId!: number;
  requestId!: number;
  puanDegeri!: number;
  yorum!: string | null;
  tarih!: Date;
  baslangicSehri!: string;
  varisSehri!: string;
  counterpartyId!: number;
  counterpartyName!: string;
  counterpartyUsername!: string;
  rolBaglami!: string;
}
