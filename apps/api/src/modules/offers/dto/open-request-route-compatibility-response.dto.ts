export class OpenRequestRouteCompatibilityResponseDto {
  carrierRouteId!: number;
  extraMesafeMetre!: number;
  extraSureSaniye!: number;
  uygunlukEtiketi!: "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";
}
