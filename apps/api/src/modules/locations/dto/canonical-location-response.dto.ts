export class CanonicalLocationResponseDto {
  provider!: string;
  placeId!: string;
  konumMetni!: string;
  sehir!: string;
  ilce!: string | null;
  lat!: number;
  lng!: number;
}
