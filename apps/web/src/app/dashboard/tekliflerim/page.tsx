"use client";

import CompactDetailLayout from "@/components/CompactDetailLayout";

import OffersWorkspace from "@/features/carrier-workspace/OffersWorkspace";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";

import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { type MyOfferCardChip, type MyOfferCardModel } from "@/components/MyOfferCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyOfferThreads,
  type OfferThreadSummary,
} from "@/lib/api/offer-threads";
import {
  getMyOffers,
  getOpenOfferRequestDetail,
  type OfferItem,
  type OpenOfferRequestDetail,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { formatDateOnly } from "@/lib/date-only";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type OfferFilterTab = "all" | "open" | "accepted" | "rejected" | "negotiation";
type OfferSortMode = "newest" | "oldest" | "price-desc" | "price-asc";

type OfferViewModel = MyOfferCardModel & {
  isNegotiation: boolean;
  searchText: string;
  sortId: string;
  sortPrice: number;
  lastActivityAt: string | null;
};

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function isRejectedOfferStatus(status: string): boolean {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus === "REDDEDILDI" || normalizedStatus === "IPTAL_EDILDI";
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatPlanningDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return formatDateOnly(value);
}

function buildInitials(value: string | null | undefined): string {
  const parts = (value ?? "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "MY";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function buildRouteMeta(
  offer: OfferItem,
  detail: OpenOfferRequestDetail | null
): string | null {
  if (!detail) {
    return null;
  }

  const pickup = formatLocationLabel(
    detail.baslangicKonumMetni,
    detail.baslangicSehri
  );
  const dropoff = formatLocationLabel(detail.varisKonumMetni, detail.varisSehri);

  if (pickup === offer.baslangicSehri && dropoff === offer.varisSehri) {
    return null;
  }

  return `${pickup} -> ${dropoff}`;
}

function buildOfferChips(detail: OpenOfferRequestDetail | null): MyOfferCardChip[] {
  if (!detail) {
    return [];
  }

  const chips: MyOfferCardChip[] = [
    {
      label: getCargoTypeLabel(detail.yukTipi),
    },
  ];

  if (detail.agirlikKg !== null) {
    chips.push({ label: formatWeightKg(detail.agirlikKg) });
  }

  if (detail.hacimM3 !== null) {
    chips.push({ label: formatVolumeM3(detail.hacimM3) });
  }

  const plannedDate = formatPlanningDate(detail.tasimaTarihi);

  if (plannedDate) {
    chips.push({ label: `Tercih: ${plannedDate}`, tone: "blue" });
  }

  if (detail.tekTasimaIstiyor) {
    chips.push({ label: "Tek tasima", tone: "amber" });
  }

  return chips;
}

function buildOfferSignal(
  status: string,
  isNegotiation: boolean
): Pick<MyOfferCardModel, "sinyalEtiketi" | "sinyalTonu"> {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "KABUL_EDILDI") {
    return {
      sinyalEtiketi: "Nakliye akisi basladi",
      sinyalTonu: "emerald",
    };
  }

  if (isRejectedOfferStatus(normalizedStatus)) {
    return {
      sinyalEtiketi: "Surec sonuclandi",
      sinyalTonu: "slate",
    };
  }

  if (isNegotiation) {
    return {
      sinyalEtiketi: "Muzakere acik",
      sinyalTonu: "blue",
    };
  }

  return {
    sinyalEtiketi: "Yanit bekliyor",
    sinyalTonu: "amber",
  };
}

export default function MyOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
  const [requestDetailsById, setRequestDetailsById] = useState<
    Record<string, OpenOfferRequestDetail | null>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OfferFilterTab>("all");
  const [sortMode, setSortMode] = useState<OfferSortMode>("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrichmentPending, setIsEnriching] = useState(false);
  const isEnriching =
    status === "ready" &&
    Boolean(accessToken) &&
    offers.length > 0 &&
    isEnrichmentPending;

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      return;
    }

    let isMounted = true;

    const loadOffers = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [offersResult, threadsResult] =
          await Promise.allSettled([
            getMyOffers(accessToken),
            getMyOfferThreads(accessToken, { as: "carrier" }),
          ]);

        if (!isMounted) {
          return;
        }

        if (offersResult.status === "rejected") {
          throw offersResult.reason;
        }

        if (
          threadsResult.status === "rejected" &&
          threadsResult.reason instanceof ApiClientError &&
          threadsResult.reason.status === 401
        ) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (
          threadsResult.status === "rejected" &&
          threadsResult.reason instanceof ApiClientError &&
          threadsResult.reason.status === 403
        ) {
          router.replace("/");
          return;
        }

        setOffers(offersResult.value);
        setThreads(threadsResult.status === "fulfilled" ? threadsResult.value : []);
        setRequestDetailsById({});
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          router.replace("/");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Teklifler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadOffers();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  useEffect(() => {
    if (status !== "ready" || !accessToken || offers.length === 0) {
      return;
    }

    const requestIds = [
      ...new Set(
        offers
          .filter((offer) => normalizeStatus(offer.durum) === "OLUSTURULDU")
          .map((offer) => offer.requestId)
          .filter((requestId) => requestDetailsById[requestId] === undefined)
      ),
    ];

    if (requestIds.length === 0) {
      return;
    }

    let isMounted = true;

    const loadOpenRequestDetails = async () => {
      try {
        setIsEnriching(true);

        const results = await Promise.allSettled(
          requestIds.map(async (requestId) => {
            const detail = await getOpenOfferRequestDetail(requestId, accessToken);
            return { requestId, detail };
          })
        );

        if (!isMounted) {
          return;
        }

        const hasUnauthorized = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof ApiClientError &&
            result.reason.status === 401
        );

        if (hasUnauthorized) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        const hasForbidden = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof ApiClientError &&
            result.reason.status === 403
        );

        if (hasForbidden) {
          router.replace("/");
          return;
        }

        setRequestDetailsById((currentState) => {
          const nextState = { ...currentState };

          for (const [index, result] of results.entries()) {
            if (result.status === "fulfilled") {
              nextState[result.value.requestId] = result.value.detail;
              continue;
            }

            const requestId = requestIds[index];
            nextState[requestId] = null;
          }

          return nextState;
        });
      } finally {
        if (!isMounted) {
          return;
        }

        setIsEnriching(false);
      }
    };

    void loadOpenRequestDetails();

    return () => {
      isMounted = false;
    };
  }, [accessToken, offers, requestDetailsById, router, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const openOfferCount = offers.filter(
    (offer) => normalizeStatus(offer.durum) === "OLUSTURULDU"
  ).length;
  const acceptedOfferCount = offers.filter(
    (offer) => normalizeStatus(offer.durum) === "KABUL_EDILDI"
  ).length;
  const rejectedOfferCount = offers.filter((offer) =>
    isRejectedOfferStatus(offer.durum)
  ).length;
  const threadByOfferId = new Map(threads.map((thread) => [thread.offerId, thread]));

  const offerCards: OfferViewModel[] = offers.map((offer) => {
    const thread = threadByOfferId.get(offer.id) ?? null;
    const detail = requestDetailsById[offer.requestId] ?? null;
    const isNegotiation =
      normalizeStatus(offer.durum) === "OLUSTURULDU" &&
      Boolean(thread?.lastMessageAt || thread?.lastMessageSummary);
    const signal = buildOfferSignal(offer.durum, isNegotiation);
    const customerName = thread?.karsiTarafAdSoyad ?? null;
    const customerUsername = thread?.karsiTarafKullaniciAdi ?? null;
    const customerProfileImageUrl = thread?.karsiTarafProfileImageUrl;
    const trackingParts = [
      offer.aracPlaka ? `Arac: ${offer.aracPlaka}` : "Arac bilgisi yok",
      offer.planlananAlimTarihi
        ? `Planlanan alim: ${formatDateOnly(offer.planlananAlimTarihi)}`
        : null,
    ].filter(Boolean);

    const searchText = [
      offer.baslangicSehri,
      offer.varisSehri,
      customerName,
      customerUsername,
      offer.not,
      detail?.yukTipi ? getCargoTypeLabel(detail.yukTipi) : null,
      detail?.yukDetay,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return {
      id: offer.id,
      requestId: offer.requestId,
      durum: offer.durum,
      rotaBaslik: `${offer.baslangicSehri} -> ${offer.varisSehri}`,
      rotaMeta: buildRouteMeta(offer, detail),
      fiyat: offer.fiyat,
      aracPlaka: offer.aracPlaka,
      planlananAlimTarihi: formatDateOnly(offer.planlananAlimTarihi, ""),
      tahminiTeslimTarihi: formatDateOnly(offer.tahminiTeslimTarihi, ""),
      musteriAdi: customerName,
      musteriKullaniciAdi: customerUsername,
      musteriBasHarfler: buildInitials(customerName ?? customerUsername),
      musteriProfileImageUrl: customerProfileImageUrl,
      not: offer.not,
      chipler: buildOfferChips(detail),
      takipMetni: trackingParts.join(" | "),
      sonHareketTarihi: formatDateTime(thread?.lastMessageAt ?? null),
      sonHareketAciklamasi: thread?.lastMessageSummary ?? null,
      sinyalEtiketi: signal.sinyalEtiketi,
      sinyalTonu: signal.sinyalTonu,
      hasUnread: thread?.hasUnread ?? false,
      conversationHref: `/dashboard/konusmalar/teklif/${offer.id}`,
      detailHref: `/dashboard/acik_istekler/${offer.requestId}`,
      isNegotiation,
      searchText,
      sortId: offer.id,
      sortPrice: offer.fiyat,
      lastActivityAt: thread?.lastMessageAt ?? null,
    };
  });

  const negotiationCount = offerCards.filter((offer) => offer.isNegotiation).length;
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");

  const filteredOffers = offerCards.filter((offer) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      offer.searchText.includes(normalizedSearchQuery);

    if (!matchesSearch) {
      return false;
    }

    switch (activeTab) {
      case "open":
        return normalizeStatus(offer.durum) === "OLUSTURULDU";
      case "accepted":
        return normalizeStatus(offer.durum) === "KABUL_EDILDI";
      case "rejected":
        return isRejectedOfferStatus(offer.durum);
      case "negotiation":
        return offer.isNegotiation;
      default:
        return true;
    }
  });

  const sortedOffers = [...filteredOffers].sort((left, right) => {
    if (sortMode === "oldest") {
      return left.sortId.localeCompare(right.sortId);
    }

    if (sortMode === "price-desc") {
      return right.sortPrice - left.sortPrice;
    }

    if (sortMode === "price-asc") {
      return left.sortPrice - right.sortPrice;
    }

    return right.sortId.localeCompare(left.sortId);
  });

  const handleResetLocalFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortMode("newest");
  };

  return (
    <CompactDetailLayout>
<CarrierVehiclesShell title="Tekliflerim" description="Tekliflerinizi, müşteri yanıtlarını ve görüşmelerinizi takip edin."
      headerVariant="compact" motionPreset="operational" cardMotionLimit={6}
      headerActions={<div className="flex flex-wrap items-center gap-3"><InlineHelpTrigger helpKey="my-offers" /></div>}>
      <OffersWorkspace items={sortedOffers} totalCount={offers.length} isEnriching={isEnriching}
        isLoading={isLoading} errorMessage={errorMessage} query={searchQuery} filter={activeTab} sort={sortMode}
        onQueryChange={setSearchQuery} onFilterChange={setActiveTab} onSortChange={setSortMode} onReset={handleResetLocalFilters}
        metrics={[
          { label: "Toplam teklif", value: offers.length, description: negotiationCount + " görüşülen teklif" },
          { label: "Yanıt bekleyen", value: openOfferCount, description: "Müşteri kararını bekleyenler" },
          { label: "Kabul edilen", value: acceptedOfferCount, description: "Anlaşmaya varılan teklifler" },
          { label: "Reddedilen / iptal", value: rejectedOfferCount, description: "Olumsuz sonuçlanan teklifler" },
        ]} />
    </CarrierVehiclesShell>
</CompactDetailLayout>
  );
}
