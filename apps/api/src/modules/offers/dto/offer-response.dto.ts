export class OfferResponseDto {
  id!: string;
  requestId!: string;
  baslangicSehri!: string;
  varisSehri!: string;
  aracId!: string | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  durum!: string;
}
