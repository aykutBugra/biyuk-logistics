import type { CanonicalLocation, LocationSuggestion } from "../location.types";

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: {
      text?: string;
    };
    structuredFormat?: {
      mainText?: {
        text?: string;
      };
      secondaryText?: {
        text?: string;
      };
    };
  };
};

type GoogleAutocompleteResponse = {
  suggestions?: GoogleAutocompleteSuggestion[];
};

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlaceDetailsResponse = {
  id?: string;
  formattedAddress?: string;
  displayName?: {
    text?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  addressComponents?: GoogleAddressComponent[];
};

function normalizeLocationText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCanonicalName(value: string): string {
  return normalizeLocationText(value).toLocaleUpperCase("tr-TR");
}

function findComponent(
  components: GoogleAddressComponent[] | undefined,
  types: string[]
): GoogleAddressComponent | undefined {
  if (!components) {
    return undefined;
  }

  return components.find((component) => {
    const componentTypes = component.types ?? [];
    return types.some((type) => componentTypes.includes(type));
  });
}

export function mapGoogleAutocompleteResponse(
  response: GoogleAutocompleteResponse
): LocationSuggestion[] {
  return (response.suggestions ?? [])
    .map((suggestion) => {
      const prediction = suggestion.placePrediction;
      const placeId = prediction?.placeId?.trim();

      if (!placeId) {
        return null;
      }

      const primaryText = normalizeLocationText(
        prediction?.structuredFormat?.mainText?.text ??
          prediction?.text?.text ??
          ""
      );
      const secondaryTextRaw = prediction?.structuredFormat?.secondaryText?.text ?? "";
      const secondaryText = secondaryTextRaw
        ? normalizeLocationText(secondaryTextRaw)
        : null;
      const fullText = normalizeLocationText(
        prediction?.text?.text ??
          [primaryText, secondaryText].filter(Boolean).join(", ")
      );

      return {
        provider: "google",
        placeId,
        primaryText: primaryText || fullText,
        secondaryText,
        fullText: fullText || primaryText,
      } satisfies LocationSuggestion;
    })
    .filter((suggestion): suggestion is LocationSuggestion => suggestion !== null);
}

export function mapGooglePlaceDetailsResponse(
  response: GooglePlaceDetailsResponse
): CanonicalLocation {
  const placeId = response.id?.trim();
  const latitude = response.location?.latitude;
  const longitude = response.location?.longitude;

  if (!placeId || typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Google Place Details response is missing required location fields.");
  }

  const displayText = normalizeLocationText(
    response.formattedAddress ??
      response.displayName?.text ??
      placeId
  );

  const districtComponent =
    findComponent(response.addressComponents, ["administrative_area_level_2"]) ??
    findComponent(response.addressComponents, ["sublocality_level_1"]) ??
    findComponent(response.addressComponents, ["locality"]);
  const cityComponent =
    findComponent(response.addressComponents, ["administrative_area_level_1"]) ??
    findComponent(response.addressComponents, ["locality"]) ??
    districtComponent;

  const city = normalizeCanonicalName(cityComponent?.longText ?? displayText);
  const district = districtComponent?.longText
    ? normalizeCanonicalName(districtComponent.longText)
    : null;

  return {
    provider: "google",
    placeId,
    konumMetni: displayText,
    sehir: city,
    ilce: district,
    lat: latitude,
    lng: longitude,
  };
}
