export const REQUEST_LOCATION_PROVIDER_NAMES = ["google"] as const;

export const REQUEST_CARGO_TYPES = [
  "GENEL",
  "PALETLI",
  "KOLI",
  "MOBILYA",
  "BEYAZ_ESYA",
  "INSAAT_MALZEMESI",
  "DIGER",
] as const;

export type RequestCargoType = (typeof REQUEST_CARGO_TYPES)[number];
