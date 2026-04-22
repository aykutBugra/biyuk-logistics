export class TransportRequestListItemResponseDto {
  id!: number;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  rotaMesafeMetre!: number | null;    //görevi get post ve put işlemlerinde rota mesafe bilgisini tutar
  rotaSureSaniye!: number | null;    //görevi get post ve put işlemlerinde rota süre bilgisini tutar
  tekTasimaIstiyor!: boolean;
  agirlikKg!: number | null;
  hacimM3!: number | null;
  yukTipi!: string;
  tasimaTarihi!: string | null;
  yukDetay!: string;
  olusturmaTarihi!: Date;
  durum!: string;
}
