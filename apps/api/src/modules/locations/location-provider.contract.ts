import type { CanonicalLocation, LocationSuggestion } from "./location.types";

export interface LocationProvider {
  readonly providerName: string;
  autocomplete(query: string, sessionToken?: string): Promise<LocationSuggestion[]>;
  getPlaceDetails(placeId: string, sessionToken?: string): Promise<CanonicalLocation>;
}
