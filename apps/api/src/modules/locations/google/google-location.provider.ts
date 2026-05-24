import { Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../../common/errors";
import { ConfigService } from "@nestjs/config";
import type { LocationProvider } from "../location-provider.contract";
import type { CanonicalLocation, LocationSuggestion } from "../location.types";
import {
  mapGoogleAutocompleteResponse,
  mapGooglePlaceDetailsResponse,
} from "./google-location.helpers";

@Injectable()
export class GoogleLocationProvider implements LocationProvider {
  readonly providerName = "google";

  constructor(private readonly configService: ConfigService) {}

  async autocomplete(
    query: string,
    sessionToken?: string
  ): Promise<LocationSuggestion[]> {
    const apiKey = this.requireGoogleApiKey();
    const defaultLanguageCode =
      this.configService.get<string>("maps.defaultLanguageCode") ?? "tr";
    const defaultRegionCode =
      this.configService.get<string>("maps.defaultRegionCode") ?? "TR";

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: [defaultRegionCode.toLowerCase()],
        languageCode: defaultLanguageCode,
        ...(sessionToken ? { sessionToken } : {}),
      }),
    });

    if (!response.ok) {
      throw AppErrors.badGateway(
        AppErrorCode.LOCATION_ROUTE_BAD_GATEWAY,
        "Konum onerileri su anda getirilemiyor."
      );
    }

    const payload = (await response.json()) as unknown;
    return mapGoogleAutocompleteResponse(payload as never).slice(0, 5);
  }

  async getPlaceDetails(
    placeId: string,
    sessionToken?: string
  ): Promise<CanonicalLocation> {
    const apiKey = this.requireGoogleApiKey();
    const defaultLanguageCode =
      this.configService.get<string>("maps.defaultLanguageCode") ?? "tr";
    const defaultRegionCode =
      this.configService.get<string>("maps.defaultRegionCode") ?? "TR";
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set("languageCode", defaultLanguageCode);
    url.searchParams.set("regionCode", defaultRegionCode);
    if (sessionToken) {
      url.searchParams.set("sessionToken", sessionToken);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,addressComponents",
      },
    });

    if (!response.ok) {
      throw AppErrors.badGateway(
        AppErrorCode.LOCATION_ROUTE_BAD_GATEWAY,
        "Secilen konum ayrintilari getirilemiyor."
      );
    }

    const payload = (await response.json()) as unknown;

    try {
      return mapGooglePlaceDetailsResponse(payload as never);
    } catch {
      throw AppErrors.badGateway(
        AppErrorCode.LOCATION_ROUTE_BAD_GATEWAY,
        "Secilen konum dogrulanamadi."
      );
    }
  }

  private requireGoogleApiKey(): string {
    const apiKey = this.configService.get<string>("maps.googleApiKey")?.trim();

    if (apiKey) {
      return apiKey;
    }

    throw AppErrors.internal(
      AppErrorCode.LOCATION_INTERNAL,
      "Google Maps provider is not configured."
    );
  }
}
