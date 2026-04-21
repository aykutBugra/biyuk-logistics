export class LocationSuggestionResponseDto {
  provider!: string;
  placeId!: string;
  primaryText!: string;
  secondaryText!: string | null;
  fullText!: string;
}
