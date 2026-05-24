import { apiFetch } from "./api-client";

export type OpenOfferRequestImageSummary = {
  id: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};

export type OpenOfferRequestImage = OpenOfferRequestImageSummary & {
  url: string;
  isPrimary: boolean;
};

export type OpenOfferRequestFilters = {
  carrierRouteId?: string;
  maxSapmaKm?: number;
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
  carrierRouteId: string;
  extraMesafeMetre: number;
  extraSureSaniye: number;
  uygunlukEtiketi: "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";
};

export type OpenOfferRequestListItem = {
  id: string;
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
  primaryImageId?: string | null;
};

export type CreateOfferInput = {
  aracId: string;
  fiyat: number;
  not?: string;
};

export type OfferItem = {
  id: string;
  requestId: string;
  baslangicSehri: string;
  varisSehri: string;
  aracId: string | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

export type IncomingOfferItem = {
  id: string;
  requestId: string;
  carrierId: string;
  carrierName: string;
  carrierUsername: string;
  carrierProfileImageUrl?: string;
  aracId: string | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

export type MyIncomingOfferItem = {
  id: string;
  requestId: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  carrierId: string;
  carrierName: string;
  carrierUsername: string;
  carrierProfileImageUrl?: string;
  aracId: string | null;
  aracPlaka: string | null;
  fiyat: number;
  not: string | null;
  durum: string;
};

// Acik istekler ekranindaki filtreleri bos degerleri atlayarak query string'e cevirir.
function buildSearchParams(filters: OpenOfferRequestFilters = {}): string {
  const searchParams = new URLSearchParams();

  if (filters.carrierRouteId) {
    searchParams.set("carrierRouteId", filters.carrierRouteId);

    // Sapma filtresi sadece secili rota varken anlamli oldugu icin onunla beraber gonderilir.
    if (typeof filters.maxSapmaKm === "number") {
      searchParams.set("maxSapmaKm", String(filters.maxSapmaKm));
    }
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

// Nakliyeci tarafinda teklif verilebilecek acik musteri isteklerini listeler.
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

// Detay ekraninda istek bilgisi, gorseller ve rota uyumu ayni response icinde gelir.
export function getOpenOfferRequestDetail(
  requestId: string,
  accessToken: string,
  routeContext:
    | string
    | Pick<OpenOfferRequestFilters, "carrierRouteId" | "maxSapmaKm">
    | undefined = {}
) {
  const searchParams = new URLSearchParams();
  // Eski kullanim sayisal route id, yeni kullanim route id + sapma bilgisi kabul eder.
  const normalizedRouteContext =
    typeof routeContext === "string"
      ? {
          carrierRouteId: routeContext,
        }
      : (routeContext ?? {});

  if (normalizedRouteContext.carrierRouteId) {
    searchParams.set(
      "carrierRouteId",
      normalizedRouteContext.carrierRouteId
    );

    if (typeof normalizedRouteContext.maxSapmaKm === "number") {
      searchParams.set("maxSapmaKm", String(normalizedRouteContext.maxSapmaKm));
    }
  }

  const path = searchParams.toString()
    ? `/offers/open-requests/${requestId}?${searchParams.toString()}`
    : `/offers/open-requests/${requestId}`;

  return apiFetch<OpenOfferRequestDetail>(path, {
    method: "GET",
    accessToken,
  });
}

// Nakliyeci secili musteri istegine arac, fiyat ve not ile teklif verir.
export function createOffer(
  requestId: string,
  input: CreateOfferInput,
  accessToken: string
) {
  return apiFetch<OfferItem>(`/offers/requests/${requestId}`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Nakliyecinin verdigi tum teklifleri Tekliflerim ekraninda kullanmak icin ceker.
export function getMyOffers(accessToken: string) {
  return apiFetch<OfferItem[]>("/offers/my", {
    method: "GET",
    accessToken,
  });
}

// Musteri tarafinda hesaba gelen teklifleri toplu listeler.
export function getMyIncomingOffers(accessToken: string) {
  return apiFetch<MyIncomingOfferItem[]>("/offers/incoming/my", {
    method: "GET",
    accessToken,
  });
}

// Tek bir tasima isteginin teklifleri detay sayfasinda karsilastirilir.
export function getIncomingOffersForRequest(requestId: string, accessToken: string) {
  return apiFetch<IncomingOfferItem[]>(`/offers/requests/${requestId}/incoming`, {
    method: "GET",
    accessToken,
  });
}

// Musteri teklifi kabul ettiginde backend bunu job/nakliye akisini baslatacak sekilde isler.
export function acceptOffer(offerId: string, accessToken: string) {
  return apiFetch<void>(`/offers/${offerId}/accept`, {
    method: "POST",
    accessToken,
  });
}

// Musteri istemedigi teklifi reddeder; teklif gecmiste durumu ile kalir.
export function rejectOffer(offerId: string, accessToken: string) {
  return apiFetch<void>(`/offers/${offerId}/reject`, {
    method: "POST",
    accessToken,
  });
}
