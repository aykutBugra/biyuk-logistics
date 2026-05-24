export class RatingListItemResponseDto {
  id!: string;
  jobId!: string;
  requestId!: string;
  puanDegeri!: number;
  yorum!: string | null;
  tarih!: Date;
  baslangicSehri!: string;
  varisSehri!: string;
  counterpartyId!: string;
  counterpartyName!: string;
  counterpartyUsername!: string;
  rolBaglami!: string;
}
