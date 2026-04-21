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

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type RouteMetrics = {
  distanceMeters: number;
  durationSeconds: number;
};
