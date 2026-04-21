export class MyIncomingOfferListItemResponseDto {
  id!: number;
  requestId!: number;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  tekTasimaIstiyor!: boolean;
  agirlikKg!: number | null;
  hacimM3!: number | null;
  yukTipi!: string;
  tasimaTarihi!: string | null;
  carrierId!: number;
  carrierName!: string;
  carrierUsername!: string;
  aracId!: number | null;
  aracPlaka!: string | null;
  fiyat!: number;
  not!: string | null;
  durum!: string;
}
