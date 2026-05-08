import { apiFetch } from "./api-client";

export type OpenOfferRequestImageSummary = {
  id: number;
  thumbnailUrl: string;
  width: number;
  height: number;
};

export type OpenOfferRequestImage = OpenOfferRequestImageSummary & {
  url: string;
  isPrimary: boolean;
};

export type OpenOfferRequestFilters = {
  carrierRouteId?: number;
  baslangicSehir?: string;
  varisSehir?: string;
  tekTasimaIstiyor?: boolean;
  minAgirlikKg?: number;
  maxAgirlikKg?: number;
  minHacimM3?: number;
  maxHacimM3?: number;
  yukTipi?: string;
  tasimaTarihi?: string;
};

export type OpenOfferRequestRouteCompatibility = {
  carrierRouteId: number;
  extraMesafeMetre: number;
  extraSureSaniye: number;
  uygunlukEtiketi: "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";
};

export type OpenOfferRequestListItem = {
  id: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  yukDetay: string;
  olusturmaTarihi: string;
  durum: string;
  alreadyOffered: boolean;
  rotaUyumu: OpenOfferRequestRouteCompatibility | null;
  primaryImage?: OpenOfferRequestImageSummary;
  imageCount?: number;
};

export type OpenOfferRequestDetail = OpenOfferRequestListItem & {
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  hasActiveVehicle: boolean;
  hasExistingOffer: boolean;
  images?: OpenOfferRequestImage[];
  primaryImageId?: number | null;
};

export type CreateOfferInput = {
  aracId: number;
  fiyat: number;
  not?: string;
};

export type OfferItem = {
  id: number;
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

export type IncomingOfferItem = {
  id: number;
  requestId: number;
  carrierId: number;
  carrierName: string;
  carrierUsername: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

export type MyIncomingOfferItem = {
  id: number;
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  carrierId: number;
  carrierName: string;
  carrierUsername: string;
  aracId: number | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

function buildSearchParams(filters: OpenOfferRequestFilters = {}): string {
  const searchParams = new URLSearchParams();

  if (typeof filters.carrierRouteId === "number") {
    searchParams.set("carrierRouteId", String(filters.carrierRouteId));
  }

  if (filters.baslangicSehir) {
    searchParams.set("baslangicSehir", filters.baslangicSehir);
  }

  if (filters.varisSehir) {
    searchParams.set("varisSehir", filters.varisSehir);
  }

  if (typeof filters.tekTasimaIstiyor === "boolean") {
    searchParams.set("tekTasimaIstiyor", String(filters.tekTasimaIstiyor));
  }

  if (typeof filters.minAgirlikKg === "number") {
    searchParams.set("minAgirlikKg", String(filters.minAgirlikKg));
  }

  if (typeof filters.maxAgirlikKg === "number") {
    searchParams.set("maxAgirlikKg", String(filters.maxAgirlikKg));
  }

  if (typeof filters.minHacimM3 === "number") {
    searchParams.set("minHacimM3", String(filters.minHacimM3));
  }

  if (typeof filters.maxHacimM3 === "number") {
    searchParams.set("maxHacimM3", String(filters.maxHacimM3));
  }

  if (filters.yukTipi) {
    searchParams.set("yukTipi", filters.yukTipi);
  }

  if (filters.tasimaTarihi) {
    searchParams.set("tasimaTarihi", filters.tasimaTarihi);
  }

  return searchParams.toString();
}

export function getOpenOfferRequests(
  accessToken: string,
  filters: OpenOfferRequestFilters = {}
) {
  const searchParams = buildSearchParams(filters);
  const path = searchParams
    ? `/offers/open-requests?${searchParams}`
    : "/offers/open-requests";

  return apiFetch<OpenOfferRequestListItem[]>(path, {
    method: "GET",
    accessToken,
  });
}

export function getOpenOfferRequestDetail(
  requestId: number,
  accessToken: string,
  carrierRouteId?: number
) {
  const searchParams = new URLSearchParams();

  if (typeof carrierRouteId === "number") {
    searchParams.set("carrierRouteId", String(carrierRouteId));
  }

  const path = searchParams.toString()
    ? `/offers/open-requests/${requestId}?${searchParams.toString()}`
    : `/offers/open-requests/${requestId}`;

  return apiFetch<OpenOfferRequestDetail>(path, {
    method: "GET",
    accessToken,
  });
}

export function createOffer(
  requestId: number,
  input: CreateOfferInput,
  accessToken: string
) {
  return apiFetch<OfferItem>(`/offers/requests/${requestId}`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function getMyOffers(accessToken: string) {
  return apiFetch<OfferItem[]>("/offers/my", {
    method: "GET",
    accessToken,
  });
}

export function getMyIncomingOffers(accessToken: string) {
  return apiFetch<MyIncomingOfferItem[]>("/offers/incoming/my", {
    method: "GET",
    accessToken,
  });
}

export function getIncomingOffersForRequest(requestId: number, accessToken: string) {
  return apiFetch<IncomingOfferItem[]>(`/offers/requests/${requestId}/incoming`, {
    method: "GET",
    accessToken,
  });
}

export function acceptOffer(offerId: number, accessToken: string) {
  return apiFetch<void>(`/offers/${offerId}/accept`, {
    method: "POST",
    accessToken,
  });
}

export function rejectOffer(offerId: number, accessToken: string) {
  return apiFetch<void>(`/offers/${offerId}/reject`, {
    method: "POST",
    accessToken,
  });
}
