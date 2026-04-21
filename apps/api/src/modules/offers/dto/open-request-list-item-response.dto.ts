export class OpenRequestListItemResponseDto {
  id!: number;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  tekTasimaIstiyor!: boolean;
  agirlikKg!: number | null;
  hacimM3!: number | null;
  yukTipi!: string;
  tasimaTarihi!: string | null;
  yukDetay!: string;
  olusturmaTarihi!: Date;
  durum!: string;
  alreadyOffered!: boolean;
}
