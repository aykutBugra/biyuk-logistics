export class JobListItemResponseDto {
  id!: number;
  requestId!: number;
  baslangicSehri!: string;
  varisSehri!: string;
  anlasilanFiyat!: number;
  aracPlaka!: string;
  durum!: string;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimTarihi!: Date | null;
  counterpartyId!: number;
  counterpartyName!: string;
  counterpartyUsername!: string;
}
