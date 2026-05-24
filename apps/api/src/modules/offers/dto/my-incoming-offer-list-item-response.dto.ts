export class MyIncomingOfferListItemResponseDto {
  id!: string;
  requestId!: string;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  tekTasimaIstiyor!: boolean;
  agirlikKg!: number | null;
  hacimM3!: number | null;
  yukTipi!: string;
  tasimaTarihi!: string | null;
  carrierId!: string;
  carrierName!: string;
  carrierUsername!: string;
  carrierProfileImageUrl?: string;
  aracId!: string | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  planlananAlimTarihi!: string | null;
  tahminiTeslimTarihi!: string | null;
  durum!: string;
}
