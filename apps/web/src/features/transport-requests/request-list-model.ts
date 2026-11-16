import type { MyIncomingOfferItem } from "@/lib/api/offers";
import type { TransportRequestListItem } from "@/lib/api/transport-requests";
import { getCargoTypeLabel } from "@/lib/logistics";

export const REQUEST_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "OLUSTURULDU", label: "Açık" },
  { value: "ANLASILDI", label: "Anlaşılan" },
  { value: "TAMAMLANDI", label: "Tamamlanan" },
  { value: "IPTAL_EDILDI", label: "İptal edilen" },
] as const;

export type RequestFilter = (typeof REQUEST_FILTERS)[number]["value"];

function normalizeStatus(value: string) {
  return value.trim().toUpperCase();
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
}

export function summarizeRequests(requests: TransportRequestListItem[], offers: MyIncomingOfferItem[]) {
  const offerCounts = new Map<string, number>();
  const pendingRequestIds = new Set<string>();
  for (const offer of offers) {
    offerCounts.set(offer.requestId, (offerCounts.get(offer.requestId) ?? 0) + 1);
    if (normalizeStatus(offer.durum) === "OLUSTURULDU") pendingRequestIds.add(offer.requestId);
  }
  return {
    total: requests.length,
    open: requests.filter((request) => normalizeStatus(request.durum) === "OLUSTURULDU").length,
    agreed: requests.filter((request) => ["ANLASILDI", "TAMAMLANDI"].includes(normalizeStatus(request.durum))).length,
    pendingRequestCount: pendingRequestIds.size,
    offerCounts,
  };
}

export function countRequestsByFilter(requests: TransportRequestListItem[], filter: RequestFilter) {
  return filter === "all" ? requests.length : requests.filter((request) => normalizeStatus(request.durum) === filter).length;
}

export function selectRequests(requests: TransportRequestListItem[], filter: RequestFilter, query: string) {
  const needle = normalizeSearch(query.trim());
  return requests
    .filter((request) => filter === "all" || normalizeStatus(request.durum) === filter)
    .filter((request) => !needle || normalizeSearch([
      request.baslangicSehri,
      request.varisSehri,
      request.yukDetay,
      getCargoTypeLabel(request.yukTipi),
    ].join(" ")).includes(needle))
    .sort((left, right) => new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime());
}

export function getRequestStatusLabel(status: string) {
  switch (normalizeStatus(status)) {
    case "OLUSTURULDU": return "Açık";
    case "ANLASILDI": return "Anlaşıldı";
    case "TAMAMLANDI": return "Tamamlandı";
    case "IPTAL_EDILDI": return "İptal edildi";
    default: return status;
  }
}
