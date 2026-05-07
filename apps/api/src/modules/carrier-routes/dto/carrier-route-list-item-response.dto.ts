export class CarrierRouteListItemResponseDto {
  id!: number;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  rotaMesafeMetre!: number | null;
  rotaSureSaniye!: number | null;
  planlananTarih!: string;
  maksimumSapmaKm!: number | null;
  olusturmaTarihi!: Date;
}
