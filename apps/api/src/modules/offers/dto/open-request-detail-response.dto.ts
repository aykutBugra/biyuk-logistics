import { RequestImageResponseDto } from "../../../common/dto/request-image-response.dto";
import { OpenRequestListItemResponseDto } from "./open-request-list-item-response.dto";

export class OpenRequestDetailResponseDto extends OpenRequestListItemResponseDto {
  baslangicProvider!: string | null;
  varisProvider!: string | null;
  baslangicPlaceId!: string | null;
  varisPlaceId!: string | null;
  normalizeBaslangicSehir!: string | null;
  normalizeVarisSehir!: string | null;
  normalizeBaslangicIlce!: string | null;
  normalizeVarisIlce!: string | null;
  hasActiveVehicle!: boolean;
  hasExistingOffer!: boolean;
  images?: RequestImageResponseDto[];
  primaryImageId?: string | null;
}
