import { apiFetch } from "./api-client";

export type LocationSuggestion = {
  provider: string;
  placeId: string;
  primaryText: string;
  secondaryText: string | null;
  fullText: string;
};

export type CanonicalLocation = {
  provider: string;
  placeId: string;
  konumMetni: string;
  sehir: string;
  ilce: string | null;
  lat: number;
  lng: number;
};

export type LocationSelectionInput = {
  provider: string;
  placeId: string;
  sessionToken?: string;
};

export type SelectedLocation = CanonicalLocation & {
  sessionToken?: string;
};

export function autocompleteLocations(
  query: string,
  accessToken: string,
  sessionToken?: string
) {
  const searchParams = new URLSearchParams();
  searchParams.set("q", query);

  if (sessionToken) {
    searchParams.set("sessionToken", sessionToken);
  }

  return apiFetch<LocationSuggestion[]>(
    `/locations/autocomplete?${searchParams.toString()}`,
    {
      method: "GET",
      accessToken,
    }
  );
}

export function getLocationPlaceDetails(
  placeId: string,
  accessToken: string,
  sessionToken?: string
) {
  const searchParams = new URLSearchParams();

  if (sessionToken) {
    searchParams.set("sessionToken", sessionToken);
  }

  const suffix = searchParams.toString();
  const path = suffix
    ? `/locations/places/${encodeURIComponent(placeId)}?${suffix}`
    : `/locations/places/${encodeURIComponent(placeId)}`;

  return apiFetch<CanonicalLocation>(path, {
    method: "GET",
    accessToken,
  });
}
