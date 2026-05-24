export class OpenRequestRouteCompatibilityResponseDto {
  carrierRouteId!: string;
  extraMesafeMetre!: number;
  extraSureSaniye!: number;
  uygunlukEtiketi!: "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";
}
