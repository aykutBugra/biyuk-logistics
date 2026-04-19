export class OfferResponseDto {
  id!: number;
  requestId!: number;
  baslangicSehri!: string;
  varisSehri!: string;
  aracId!: number | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  durum!: string;
}
