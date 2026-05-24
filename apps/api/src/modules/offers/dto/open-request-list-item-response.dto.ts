import { RequestImageSummaryResponseDto } from "../../../common/dto/request-image-summary-response.dto";
import { OpenRequestRouteCompatibilityResponseDto } from "./open-request-route-compatibility-response.dto";

export class OpenRequestListItemResponseDto {
  id!: string;
  baslangicSehri!: string;
  varisSehri!: string;
  baslangicKonumMetni!: string | null;
  varisKonumMetni!: string | null;
  baslangicEnlem!: number;
  baslangicBoylam!: number;
  varisEnlem!: number;
  varisBoylam!: number;
  rotaMesafeMetre!: number | null;
  rotaSureSaniye!: number | null;
  tekTasimaIstiyor!: boolean;
  agirlikKg!: number | null;
  hacimM3!: number | null;
  yukTipi!: string;
  tasimaTarihi!: string | null;
  yukDetay!: string;
  olusturmaTarihi!: Date;
  durum!: string;
  alreadyOffered!: boolean;
  rotaUyumu!: OpenRequestRouteCompatibilityResponseDto | null;
  primaryImage?: RequestImageSummaryResponseDto;
  imageCount?: number;
}
