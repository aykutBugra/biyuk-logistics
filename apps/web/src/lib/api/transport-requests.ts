import { apiFetch } from "./api-client";
import type { LocationSelectionInput } from "./locations";
import type { RatingContext } from "./ratings";

export type CreateTransportRequestInput = {
  baslangicKonum: LocationSelectionInput;
  varisKonum: LocationSelectionInput;
  tekTasimaIstiyor: boolean;
  agirlikKg: number;
  hacimM3: number;
  yukTipi: string;
  tasimaTarihi: string;
  yukDetay: string;
};

export type UpdateTransportRequestInput = CreateTransportRequestInput;

export type TransportRequestImageSummary = {
  id: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};

export type TransportRequestImage = TransportRequestImageSummary & {
  url: string;
  isPrimary: boolean;
};

export type TransportRequestListItem = {
  id: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  rotaMesafeMetre: number | null;     //frontend typescriptin bu alanları tanımasını sağlar
  rotaSureSaniye: number | null;      //yeni
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  yukDetay: string;
  olusturmaTarihi: string;
  durum: string;
  primaryImage?: TransportRequestImageSummary;
  imageCount?: number;
};

export type TransportRequestDetail = TransportRequestListItem & {
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  images?: TransportRequestImage[];
  primaryImageId?: string | null;
  nakliye: {
    id: string;
    carrierId: string;
    carrierName: string;
    carrierUsername: string;
    aracId: string;
    aracPlaka: string;
    anlasilanFiyat: number;
    durum: string;
    olusturmaTarihi: string;
    baslangicTarihi: string | null;
    teslimBildirimTarihi: string | null;
    teslimTarihi: string | null;
    canConfirmDelivery: boolean;
    ratingContext: RatingContext;
  } | null;
};

// Musteri yeni tasima istegi olustururken iki konum ve yuk bilgileri backend'e gider.
export function createTransportRequest(
  input: CreateTransportRequestInput,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>("/transport-requests", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Musterinin kendi actigi tasima taleplerini liste ekraninda kullanir.
export function getMyTransportRequests(accessToken: string) {
  return apiFetch<TransportRequestListItem[]>("/transport-requests/my", {
    method: "GET",
    accessToken,
  });
}

// Talep detayinda konum, gorseller, kabul edilmis nakliye ve puanlama bilgisi beraber gelir.
export function getTransportRequestDetail(id: string, accessToken: string) {
  return apiFetch<TransportRequestDetail>(`/transport-requests/${id}`, {
    method: "GET",
    accessToken,
  });
}

// Talep henuz mutable durumdaysa backend guncellemeyi kabul eder.
export function updateTransportRequest(
  id: string,
  input: UpdateTransportRequestInput,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>(`/transport-requests/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Musteri kendi acik talebini silebilir; sahiplik ve durum kontrolu backend'dedir.
export function deleteTransportRequest(id: string, accessToken: string) {
  return apiFetch<void>(`/transport-requests/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

// Talep fotograflari dosya oldugu icin FormData ile yuklenir.
export function uploadTransportRequestImages(
  requestId: string,
  formData: FormData,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>(`/transport-requests/${requestId}/images`, {
    method: "POST",
    accessToken,
    body: formData,
  });
}

// Tek fotograf silindikten sonra backend guncel detay objesini dondurur.
export function deleteTransportRequestImage(
  requestId: string,
  imageId: string,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>(
    `/transport-requests/${requestId}/images/${imageId}`,
    {
      method: "DELETE",
      accessToken,
    }
  );
}

// Galeride hangi fotograf ana gorsel olacaksa backend'de primary olarak isaretlenir.
export function setPrimaryTransportRequestImage(
  requestId: string,
  imageId: string,
  accessToken: string
) {
  return apiFetch<TransportRequestDetail>(
    `/transport-requests/${requestId}/images/${imageId}/primary`,
    {
      method: "PATCH",
      accessToken,
    }
  );
}
