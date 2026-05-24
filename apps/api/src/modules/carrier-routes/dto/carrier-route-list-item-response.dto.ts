export class CarrierRouteListItemResponseDto {
  id!: string;
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
