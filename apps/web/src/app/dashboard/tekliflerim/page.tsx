"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import DashboardActionCard from "@/components/DashboardActionCard";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MyOfferCard, {
  type MyOfferCardChip,
  type MyOfferCardModel,
} from "@/components/MyOfferCard";
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
  sortId: number;
  sortPrice: number;
  lastActivityAt: string | null;
};

const FILTER_TABS: Array<{
  key: OfferFilterTab;
  label: string;
}> = [
  { key: "all", label: "Tumu" },
  { key: "open", label: "Bekleyen" },
  { key: "accepted", label: "Kabul edilen" },
  { key: "rejected", label: "Reddedilen" },
  { key: "negotiation", label: "Muzakere" },
];

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

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(parsedDate);
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
    chips.push({ label: plannedDate, tone: "blue" });
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

function OfferToolbar(props: {
  searchQuery: string;
  activeTab: OfferFilterTab;
  sortMode: OfferSortMode;
  totalCount: number;
  isRefreshingDetails: boolean;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTabChange: (tab: OfferFilterTab) => void;
  onSortChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="relative">
          <i className="pi pi-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
          <input
            type="search"
            value={props.searchQuery}
            onChange={props.onSearchChange}
            placeholder="Rota, musteri veya yuk ara"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={props.sortMode}
            onChange={props.onSortChange}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300"
          >
            <option value="newest">En yeni</option>
            <option value="oldest">En eski</option>
            <option value="price-desc">Tutar yuksek</option>
            <option value="price-asc">Tutar dusuk</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => props.onTabChange(tab.key)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                props.activeTab === tab.key
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{props.totalCount} teklif goruntuleniyor</span>
          {props.isRefreshingDetails ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              Ek detaylar yenileniyor
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SidebarSection(props: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <h2 className="text-[1.45rem] font-black tracking-tight text-slate-950">
        {props.title}
      </h2>
      {props.description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{props.description}</p>
      ) : null}
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

export default function MyOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
  const [requestDetailsById, setRequestDetailsById] = useState<
    Record<number, OpenOfferRequestDetail | null>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OfferFilterTab>("all");
  const [sortMode, setSortMode] = useState<OfferSortMode>("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
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
      setIsEnriching(false);
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
      detail?.tasimaTarihi ? `Planlanan tarih: ${detail.tasimaTarihi}` : null,
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
      return left.sortId - right.sortId;
    }

    if (sortMode === "price-desc") {
      return right.sortPrice - left.sortPrice;
    }

    if (sortMode === "price-asc") {
      return left.sortPrice - right.sortPrice;
    }

    return right.sortId - left.sortId;
  });

  const handleResetLocalFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortMode("newest");
  };

  return (
    <CarrierVehiclesShell
      title="Tekliflerim"
      description="Verdigin teklifleri, her birinin mevcut durumunu ve musteri yanitlarini buradan takip et."
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={<InlineHelpTrigger helpKey="my-offers" />}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div
          data-dashboard-primary
          className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="space-y-4">
          <div
            data-dashboard-stats
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <CustomerMetricCard
              label="Toplam teklif"
              value={offers.length}
              hint="Tum teklif kayitlarin"
              tone="blue"
              icon={<i className="pi pi-send text-lg" />}
            />
            <CustomerMetricCard
              label="Yanit bekleyen"
              value={openOfferCount}
              hint="Musteri karari bekleniyor"
              tone="amber"
              icon={<i className="pi pi-clock text-lg" />}
            />
            <CustomerMetricCard
              label="Kabul edilen"
              value={acceptedOfferCount}
              hint="Nakliyeye donusen teklifler"
              tone="emerald"
              icon={<i className="pi pi-check-circle text-lg" />}
            />
            <CustomerMetricCard
              label="Reddedilen"
              value={rejectedOfferCount}
              hint="Reddedilen veya iptal edilen"
              tone="violet"
              icon={<i className="pi pi-times-circle text-lg" />}
            />
          </div>

          {offers.length === 0 ? (
            <div data-dashboard-primary>
              <EmptyStateCard
                title="Henuz teklif yok"
                description="Acik istekleri inceleyip ilk teklifini verdiginde burada goreceksin."
                actionHref="/dashboard/acik_istekler"
                actionLabel="Acik istekleri incele"
              />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <OfferToolbar
                  searchQuery={searchQuery}
                  activeTab={activeTab}
                  sortMode={sortMode}
                  totalCount={sortedOffers.length}
                  isRefreshingDetails={isEnriching}
                  onSearchChange={(event) => setSearchQuery(event.target.value)}
                  onTabChange={setActiveTab}
                  onSortChange={(event) =>
                    setSortMode(event.target.value as OfferSortMode)
                  }
                />

                <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                            Tum teklifler
                          </h2>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {sortedOffers.length}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Tekliflerini rota, musteri ve son hareket baglamiyla tek listede takip et.
                        </p>
                      </div>

                      {negotiationCount > 0 ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {negotiationCount} muzakere acik
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    {sortedOffers.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 p-6">
                        <p className="text-base font-semibold text-slate-900">
                          Bu filtrelerle eslesen teklif bulunamadi
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                          Arama metnini, durum sekmesini veya siralamayi degistirerek listeyi genisletebilirsin.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetLocalFilters}
                          className="app-button-secondary mt-5"
                        >
                          Filtreleri temizle
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {sortedOffers.map((offer) => (
                          <MyOfferCard key={offer.id} offer={offer} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <SidebarSection
                  title="Hizli islemler"
                  description="Mevcut nakliyeci akislarini kisa yoldan ac."
                >
                  <div className="grid gap-3">
                    <DashboardActionCard
                      href="/dashboard/acik_istekler"
                      title="Acik istekleri incele"
                      variant="quiet"
                    />
                    <DashboardActionCard
                      href="/dashboard/rotalarim"
                      title="Rotalarimi gor"
                      variant="quiet"
                    />
                    <DashboardActionCard
                      href="/dashboard/araclarim"
                      title="Araclarimi yonet"
                      variant="quiet"
                    />
                    <DashboardActionCard
                      href="/dashboard/konusmalar"
                      title="Konusmalari ac"
                      variant="quiet"
                    />
                  </div>
                </SidebarSection>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
