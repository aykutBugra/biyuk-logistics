export class OfferResponseDto {
  id!: string;
  requestId!: string;
  baslangicSehri!: string;
  varisSehri!: string;
  aracId!: string | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
  durum!: string;
}
