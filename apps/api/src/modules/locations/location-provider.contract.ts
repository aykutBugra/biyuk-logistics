import type { CanonicalLocation, LocationSuggestion } from "./location.types";


//LocationProvider, konum sağlayıcılarının uyması gereken bir sözleşmeyi tanımlar.
//  Bu sözleşme, konum önerileri alma ve belirli bir yerin detaylarını getirme gibi 
// işlevleri içerir. Her konum sağlayıcısı, bu arayüzü uygulayarak kendi özgü konum
//  verilerini sunabilir.
export interface LocationProvider {
  readonly providerName: string;
  autocomplete(query: string, sessionToken?: string): Promise<LocationSuggestion[]>;
  getPlaceDetails(placeId: string, sessionToken?: string): Promise<CanonicalLocation>;
}
