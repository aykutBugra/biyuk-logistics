export class JobListItemResponseDto {
  id!: string;
  requestId!: string;
  participantSide!: "customer" | "carrier";
  baslangicSehri!: string;
  varisSehri!: string;
  anlasilanFiyat!: number;
  aracPlaka!: string;
  durum!: string;
  olusturmaTarihi!: Date;
  baslangicTarihi!: Date | null;
  teslimBildirimTarihi!: Date | null;
  teslimTarihi!: Date | null;
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
  counterpartyId!: string;
  counterpartyName!: string;
  counterpartyUsername!: string;
}
