"use client";

import type { ChangeEvent, FormEvent } from "react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CarrierDiscoveryFilters, {
  type CarrierDiscoveryFilterForm,
} from "@/components/CarrierDiscoveryFilters";
import CarrierDiscoverySummaryCard from "@/components/CarrierDiscoverySummaryCard";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DiscoveryResultsToolbar, {
  type DiscoverySortMode,
} from "@/components/DiscoveryResultsToolbar";
import EmptyOpenRequestsState from "@/components/EmptyOpenRequestsState";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MotionCollapse from "@/components/MotionCollapse";
import OpenRequestCard from "@/components/OpenRequestCard";
import OpenRequestsMapPanel from "@/components/OpenRequestsMapPanel";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getCarrierRouteDetail,
  getMyCarrierRoutes,
  type CarrierRouteDetail,
  type CarrierRouteListItem,
} from "@/lib/api/carrier-routes";
import {
  getOpenOfferRequests,
  type OpenOfferRequestFilters,
  type OpenOfferRequestListItem,
  type OpenOfferRequestRouteCompatibility,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
  hasActiveFilters,
} from "@/lib/logistics";

const DEFAULT_MAX_SAPMA_KM = 50;

const initialFilters: CarrierDiscoveryFilterForm = {
  baslangicSehir: "",
  varisSehir: "",
  tekTasimaIstiyor: "all",
  minAgirlikKg: "",
  maxAgirlikKg: "",
  minHacimM3: "",
  maxHacimM3: "",
  yukTipi: "",
  tasimaTarihi: "",
};

function formatPlannedDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function parsePublicId(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parsePositiveNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildCarrierRouteSelectionPath(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
  carrierRouteId: string | null,
  maxSapmaKm: number | null
): string {
  const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");

  if (carrierRouteId === null) {
    nextSearchParams.delete("carrierRouteId");
    nextSearchParams.delete("maxSapmaKm");
  } else {
    nextSearchParams.set("carrierRouteId", String(carrierRouteId));

    if (typeof maxSapmaKm === "number") {
      nextSearchParams.set("maxSapmaKm", String(maxSapmaKm));
    } else {
      nextSearchParams.delete("maxSapmaKm");
    }
  }

  const nextQuery = nextSearchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

// Liste kartindan detay sayfasina giderken aktif rota/sapma context'i query ile tasinir.
function buildRequestDetailHref(
  requestId: string,
  carrierRouteId: string | null,
  maxSapmaKm: number | null
): string {
  if (carrierRouteId === null) {
    return `/dashboard/acik_istekler/${requestId}`;
  }

  const searchParams = new URLSearchParams({
    carrierRouteId: String(carrierRouteId),
  });

  if (typeof maxSapmaKm === "number") {
    searchParams.set("maxSapmaKm", String(maxSapmaKm));
  }

  return `/dashboard/acik_istekler/${requestId}?${searchParams.toString()}`;
}

// UI filtre state'i backend open requests endpoint'inin bekledigi query input'una cevrilir.
function toApiFilters(
  values: CarrierDiscoveryFilterForm,
  carrierRouteId: string | null,
  maxSapmaKm: number | null
): OpenOfferRequestFilters {
  return {
    carrierRouteId: carrierRouteId ?? undefined,
    maxSapmaKm:
      carrierRouteId !== null && typeof maxSapmaKm === "number"
        ? maxSapmaKm
        : undefined,
    baslangicSehir: values.baslangicSehir.trim() || undefined,
    varisSehir: values.varisSehir.trim() || undefined,
    tekTasimaIstiyor:
      values.tekTasimaIstiyor === "all"
        ? undefined
        : values.tekTasimaIstiyor === "true",
    minAgirlikKg: values.minAgirlikKg ? Number(values.minAgirlikKg) : undefined,
    maxAgirlikKg: values.maxAgirlikKg ? Number(values.maxAgirlikKg) : undefined,
    minHacimM3: values.minHacimM3 ? Number(values.minHacimM3) : undefined,
    maxHacimM3: values.maxHacimM3 ? Number(values.maxHacimM3) : undefined,
    yukTipi: values.yukTipi || undefined,
    tasimaTarihi: values.tasimaTarihi || undefined,
  };
}

// Harita marker'i icin baslangic/varis koordinatlari sayisal olarak mevcut mu kontrol eder.
function hasRenderableRequestCoordinates(request: OpenOfferRequestListItem): boolean {
  return (
    Number.isFinite(request.baslangicEnlem) &&
    Number.isFinite(request.baslangicBoylam) &&
    Number.isFinite(request.varisEnlem) &&
    Number.isFinite(request.varisBoylam)
  );
}

// Rota uyumu uygun olan istekler liste siralamasinda oncelik alir.
function getRouteCompatPriority(
  compatibility: OpenOfferRequestRouteCompatibility | null
): number {
  if (!compatibility) {
    return 3;
  }

  switch (compatibility.uygunlukEtiketi) {
    case "UYGUN":
      return 0;
    case "SINIRDA":
      return 1;
    case "UYGUN_DEGIL":
      return 2;
    default:
      return 3;
  }
}

// Acik istek listesi once teklif verilmemis, sonra rota uyumu daha iyi olan kayitlari one alir.
function sortRequests(
  requests: OpenOfferRequestListItem[],
  sortMode: DiscoverySortMode,
  hasRouteContext: boolean
): OpenOfferRequestListItem[] {
  return [...requests].sort((left, right) => {
    if (sortMode === "date") {
      const leftDate = left.tasimaTarihi ? new Date(left.tasimaTarihi).getTime() : Infinity;
      const rightDate = right.tasimaTarihi
        ? new Date(right.tasimaTarihi).getTime()
        : Infinity;
      return leftDate - rightDate;
    }

    if (sortMode === "newest") {
      return (
        new Date(right.olusturmaTarihi).getTime() -
        new Date(left.olusturmaTarihi).getTime()
      );
    }

    if (hasRouteContext) {
      const compatPriority =
        getRouteCompatPriority(left.rotaUyumu) - getRouteCompatPriority(right.rotaUyumu);

      if (compatPriority !== 0) {
        return compatPriority;
      }

      const deviationDelta =
        (left.rotaUyumu?.extraMesafeMetre ?? Number.MAX_SAFE_INTEGER) -
        (right.rotaUyumu?.extraMesafeMetre ?? Number.MAX_SAFE_INTEGER);

      if (deviationDelta !== 0) {
        return deviationDelta;
      }
    } else if (left.alreadyOffered !== right.alreadyOffered) {
      return left.alreadyOffered ? 1 : -1;
    }

    return (
      new Date(right.olusturmaTarihi).getTime() -
      new Date(left.olusturmaTarihi).getTime()
    );
  });
}

function OpenTransportRequestsPageFallback() {
  return <DashboardPageSkeleton />;
}

// Nakliyeci acik musteri isteklerini filtreler, haritada gosterir ve detay/teklif akisini baslatir.
function OpenTransportRequestsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken, status } = useCarrierPageAccess();
  const selectedCarrierRouteId = parsePublicId(
    searchParams?.get("carrierRouteId") ?? null
  );
  const selectedMaxSapmaKm =
    selectedCarrierRouteId !== null
      ? parsePositiveNumber(searchParams?.get("maxSapmaKm") ?? null)
      : null;
  const requestCardRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [filters, setFilters] = useState<CarrierDiscoveryFilterForm>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<CarrierDiscoveryFilterForm>(initialFilters);
  const [requests, setRequests] = useState<OpenOfferRequestListItem[]>([]);
  const [routes, setRoutes] = useState<CarrierRouteListItem[]>([]);
  const [selectedCarrierRouteDetail, setSelectedCarrierRouteDetail] =
    useState<CarrierRouteDetail | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeErrorMessage, setRouteErrorMessage] = useState<string | null>(null);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [isRoutesLoading, setIsRoutesLoading] = useState(true);

  // Ekran genisligine gore harita paneli acik gelir; kullanici kapatabilir veya acabilir.
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [hasMountedMap, setHasMountedMap] = useState(false);
  const [mapResizeSignal, setMapResizeSignal] = useState(0);
  const [hasLoadedRequestsOnce, setHasLoadedRequestsOnce] = useState(false);
  const [sortMode, setSortMode] = useState<DiscoverySortMode>("recommended");

  useEffect(() => {
    // Ilk acilista ekran genisligine gore harita paneli otomatik acilir.
    if (typeof window === "undefined") {
      return;
    }

    const shouldOpenMap = window.matchMedia("(min-width: 1024px)").matches;
    setIsMapVisible(shouldOpenMap);
    setHasMountedMap(shouldOpenMap);
  }, []);

  useEffect(() => {
    // Rota id varsa ama sapma yoksa URL varsayilan sapma degeriyle tamamlanir.
    if (!searchParams) {
      return;
    }

    if (selectedCarrierRouteId === null) {
      if (searchParams.get("maxSapmaKm")) {
        router.replace(
          buildCarrierRouteSelectionPath(pathname, searchParams, null, null)
        );
      }
      return;
    }

    if (selectedMaxSapmaKm === null) {
      router.replace(
        buildCarrierRouteSelectionPath(
          pathname,
          searchParams,
          selectedCarrierRouteId,
          DEFAULT_MAX_SAPMA_KM
        )
      );
    }
  }, [
    pathname,
    router,
    searchParams,
    selectedCarrierRouteId,
    selectedMaxSapmaKm,
  ]);

  useEffect(() => {
    // Nakliyeci guard hazir olmadan rota secenekleri cekilmez.
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsRoutesLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRoutes = async () => {
      try {
        setIsRoutesLoading(true);
        setRouteErrorMessage(null);
        const response = await getMyCarrierRoutes(accessToken);

        if (!isMounted) {
          return;
        }

        setRoutes(response);
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

        setRouteErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Rota listesi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsRoutesLoading(false);
      }
    };

    void loadRoutes();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  useEffect(() => {
    // Secili rota degisince rota detayi da yenilenir; rota silinmis ise query temizlenir.
    if (status !== "ready" || !accessToken || selectedCarrierRouteId === null) {
      setSelectedCarrierRouteDetail(null);
      return;
    }

    let isMounted = true;

    const loadSelectedCarrierRouteDetail = async () => {
      try {
        const response = await getCarrierRouteDetail(
          selectedCarrierRouteId,
          accessToken
        );

        if (!isMounted) {
          return;
        }

        setSelectedCarrierRouteDetail(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedCarrierRouteDetail(null);

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          router.replace("/");
          return;
        }

        if (error instanceof ApiClientError && error.status === 404) {
          router.replace(
            buildCarrierRouteSelectionPath(pathname, searchParams, null, null)
          );
        }
      }
    };

    void loadSelectedCarrierRouteDetail();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    pathname,
    router,
    searchParams,
    selectedCarrierRouteId,
    status,
  ]);

  useEffect(() => {
    // Filtre query'si veya rota context'i degistikce acik istekler backend'den yeniden yuklenir.
    const hasPendingRouteContext =
      selectedCarrierRouteId !== null && selectedMaxSapmaKm === null;

    if (status !== "ready" || !accessToken || hasPendingRouteContext) {
      if (status === "checking") {
        setIsRequestsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRequests = async () => {
      try {
        setIsRequestsLoading(true);
        setErrorMessage(null);

        const response = await getOpenOfferRequests(
          accessToken,
          toApiFilters(appliedFilters, selectedCarrierRouteId, selectedMaxSapmaKm)
        );

        if (!isMounted) {
          return;
        }

        setRequests(response);
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

        if (
          error instanceof ApiClientError &&
          error.status === 404 &&
          selectedCarrierRouteId !== null
        ) {
          router.replace(
            buildCarrierRouteSelectionPath(pathname, searchParams, null, null)
          );
          return;
        }

        if (
          error instanceof ApiClientError &&
          error.status === 400 &&
          selectedCarrierRouteId === null
        ) {
          router.replace(
            buildCarrierRouteSelectionPath(pathname, searchParams, null, null)
          );
          return;
        }

        if (
          error instanceof ApiClientError &&
          error.status === 503 &&
          selectedCarrierRouteId !== null
        ) {
          setErrorMessage("Secili rota filtresi su anda uygulanamiyor.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Acik istekler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setHasLoadedRequestsOnce(true);
        setIsRequestsLoading(false);
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    appliedFilters,
    pathname,
    router,
    searchParams,
    selectedCarrierRouteId,
    selectedMaxSapmaKm,
    status,
  ]);

  const selectedCarrierRoute =
    routes.find((route) => route.id === selectedCarrierRouteId) ?? null;
  const hasRouteContext = selectedCarrierRouteId !== null;

  const refinedRequests = useMemo(() => {
    return sortRequests(requests, sortMode, hasRouteContext);
  }, [hasRouteContext, requests, sortMode]);

  useEffect(() => {
    // Filtre sonrasi secili istek listede kalmiyorsa secim temizlenir.
    if (selectedRequestId === null) {
      return;
    }

    const requestStillVisible = refinedRequests.some(
      (request) => request.id === selectedRequestId
    );

    if (!requestStillVisible) {
      setSelectedRequestId(null);
    }
  }, [refinedRequests, selectedRequestId]);

  useEffect(() => {
    // Harita acildiginda hic secim yoksa ilk gorunur istek otomatik secilir.
    if (!isMapVisible || selectedRequestId !== null || refinedRequests.length === 0) {
      return;
    }

    setSelectedRequestId(refinedRequests[0].id);
  }, [isMapVisible, refinedRequests, selectedRequestId]);

  // Form alanlarindan gelen filtre degerleri local filtre state'ine yazilir.
  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  // Sehir select alanlari bos degeri undefined gibi davranacak sekilde tutulur.
  const handleCityFilterChange = (
    field: "baslangicSehir" | "varisSehir",
    value: string
  ) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  // Filtreleri uygula butonu sadece appliedFilters state'ini degistirir.
  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedRequestId(null);
    setAppliedFilters(filters);
  };

  // Tum filtreleri temizler, secili rota varsa varsayilan sapma degeriyle korur.
  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setSelectedRequestId(null);
    router.replace(
      buildCarrierRouteSelectionPath(
        pathname,
        searchParams,
        selectedCarrierRouteId,
        selectedCarrierRouteId === null ? null : DEFAULT_MAX_SAPMA_KM
      )
    );
  };

  // Rota secilince hem rota id hem de sapma limiti query'de korunur.
  const handleCarrierRouteChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCarrierRouteId = parsePublicId(event.target.value);
    setSelectedRequestId(null);

    router.replace(
      buildCarrierRouteSelectionPath(
        pathname,
        searchParams,
        nextCarrierRouteId,
        nextCarrierRouteId === null ? null : DEFAULT_MAX_SAPMA_KM
      )
    );
  };

  // Sapma limiti degisince secili rota varsa yeni query ile liste yenilenir.
  const handleMaxSapmaKmChange = (value: number) => {
    if (selectedCarrierRouteId === null) {
      return;
    }

    setSelectedRequestId(null);
    router.replace(
      buildCarrierRouteSelectionPath(
        pathname,
        searchParams,
        selectedCarrierRouteId,
        value
      )
    );
  };

  // Kart tiklamasi sadece listede secili state'i degistirir, detay linki ayri calisir.
  const handleRequestCardClick = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  // Harita marker'i secilince liste karti da ayni istek uzerine odaklanir.
  const handleRequestMarkerSelect = useCallback((requestId: string) => {
    setSelectedRequestId(requestId);

    const requestCardElement = requestCardRefs.current.get(requestId);
    requestCardElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const handleMapExpandComplete = useCallback(() => {
    setMapResizeSignal((currentSignal) => currentSignal + 1);
  }, []);

  // Mobilde harita ve liste gorunumleri ayni state uzerinden acilip kapanir.
  const handleMapToggle = () => {
    setIsMapVisible((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setHasMountedMap(true);
      }

      return nextValue;
    });
  };

  if (status !== "ready" || (isRequestsLoading && !hasLoadedRequestsOnce)) {
    return <DashboardPageSkeleton />;
  }

  const alreadyOfferedCount = refinedRequests.filter(
    (request) => request.alreadyOffered
  ).length;
  const routeAlignedCount = refinedRequests.filter(
    (request) => request.rotaUyumu?.uygunlukEtiketi === "UYGUN"
  ).length;
  const renderableRequestCount = refinedRequests.filter(
    hasRenderableRequestCoordinates
  ).length;
  const singleTransportCount = refinedRequests.filter(
    (request) => request.tekTasimaIstiyor
  ).length;
  const averageDeviationMeters =
    refinedRequests.reduce((total, request) => {
      return total + (request.rotaUyumu?.extraMesafeMetre ?? 0);
    }, 0) /
      Math.max(
        1,
        refinedRequests.filter((request) => request.rotaUyumu !== null).length
      ) || 0;
  const filtersActive = hasActiveFilters({
    ...appliedFilters,
    tekTasimaIstiyor:
      appliedFilters.tekTasimaIstiyor === "all"
        ? ""
        : appliedFilters.tekTasimaIstiyor,
  });
  const activeRouteFilterLabel =
    hasRouteContext && selectedMaxSapmaKm !== null
      ? `Maks. sapma ${selectedMaxSapmaKm} km`
      : undefined;
  const isRefreshingRequests = isRequestsLoading && hasLoadedRequestsOnce;

  const summaryCards = hasRouteContext
    ? [
        {
          label: "Acik talep",
          value: refinedRequests.length,
          subtext: "Guncel gorunum",
          icon: "pi pi-briefcase",
          tone: "blue" as const,
        },
        {
          label: "Rotana uygun",
          value: routeAlignedCount,
          subtext: "Dogrudan eslesen",
          icon: "pi pi-directions",
          tone: "emerald" as const,
        },
        {
          label: "Ortalama sapma",
          value: formatRouteDistanceKm(averageDeviationMeters),
          subtext: "Ek rota mesafesi",
          icon: "pi pi-map",
          tone: "amber" as const,
        },
        {
          label: "Teklif verilen",
          value: alreadyOfferedCount,
          subtext: "Bu listedekiler",
          icon: "pi pi-check-circle",
          tone: "slate" as const,
        },
      ]
    : [
        {
          label: "Acik talep",
          value: refinedRequests.length,
          subtext: "Teklife acik",
          icon: "pi pi-briefcase",
          tone: "blue" as const,
        },
        {
          label: "Haritada",
          value: renderableRequestCount,
          subtext: "Koordinatli talepler",
          icon: "pi pi-map-marker",
          tone: "emerald" as const,
        },
        {
          label: "Teklif verilen",
          value: alreadyOfferedCount,
          subtext: "Bu listedekiler",
          icon: "pi pi-check-circle",
          tone: "slate" as const,
        },
        {
          label: "Tek tasima",
          value: singleTransportCount,
          subtext: "Paylasimsiz istekler",
          icon: "pi pi-inbox",
          tone: "amber" as const,
        },
      ];

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {selectedCarrierRoute ? (
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          <span className="text-slate-950">
            {selectedCarrierRoute.baslangicSehri} - {selectedCarrierRoute.varisSehri}
          </span>
          {selectedMaxSapmaKm !== null ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
              Maks. sapma {selectedMaxSapmaKm} km
            </span>
          ) : null}
        </div>
      ) : null}
      <InlineHelpTrigger helpKey="open-requests" />
    </div>
  );

  return (
    <CarrierVehiclesShell
      title="Acik Istekler"
      description="Rotana uygun talepleri kesfet."
      headerActions={headerActions}
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={4}
    >
      <div className="space-y-4">
        <div data-dashboard-stats className="grid gap-3 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <CarrierDiscoverySummaryCard
              key={card.label}
              label={card.label}
              value={card.value}
              subtext={card.subtext}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start">
          <CarrierDiscoveryFilters
            resultsCount={refinedRequests.length}
            selectedCarrierRouteId={selectedCarrierRouteId}
            selectedCarrierRoute={selectedCarrierRoute}
            routes={routes}
            isRoutesLoading={isRoutesLoading}
            routeErrorMessage={routeErrorMessage}
            filters={filters}
            filtersActive={filtersActive}
            maxSapmaKm={selectedMaxSapmaKm}
            onFilterChange={handleFilterChange}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            onCarrierRouteChange={handleCarrierRouteChange}
            onBaslangicSehirChange={(value) =>
              handleCityFilterChange("baslangicSehir", value)
            }
            onVarisSehirChange={(value) =>
              handleCityFilterChange("varisSehir", value)
            }
            onMaxSapmaChange={handleMaxSapmaKmChange}
          />

          <div data-dashboard-primary className="space-y-3">
            {hasMountedMap ? (
              <MotionCollapse
                isOpen={isMapVisible}
                onExpandComplete={handleMapExpandComplete}
              >
                <OpenRequestsMapPanel
                  requests={refinedRequests}
                  selectedCarrierRoute={selectedCarrierRouteDetail}
                  maxSapmaKm={selectedMaxSapmaKm}
                  selectedRequestId={selectedRequestId}
                  onRequestSelect={handleRequestMarkerSelect}
                  isVisible={isMapVisible}
                  resizeSignal={mapResizeSignal}
                />
              </MotionCollapse>
            ) : null}

            <DiscoveryResultsToolbar
              resultsCount={refinedRequests.length}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              isMapVisible={isMapVisible}
              onMapToggle={handleMapToggle}
              hasRouteContext={hasRouteContext}
              activeFilterLabel={activeRouteFilterLabel}
            />

            <div className={isRefreshingRequests ? "opacity-70 transition" : undefined}>
              {errorMessage ? (
                <section className="app-surface rounded-[1.2rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-600">
                    Kesif hatasi
                  </p>
                  <h2 className="mt-2 text-lg font-black tracking-tight text-rose-900">
                    Acik istekler su anda guncellenemiyor
                  </h2>
                  <p className="mt-2 leading-6">{errorMessage}</p>
                </section>
              ) : refinedRequests.length === 0 ? (
                <EmptyOpenRequestsState
                  mode={
                    hasRouteContext
                      ? "no-route-match"
                      : filtersActive
                        ? "no-filter-match"
                        : "no-results"
                  }
                />
              ) : (
                <div className="grid gap-3 xl:auto-rows-fr xl:grid-cols-2">
                  {refinedRequests.map((request) => (
                    <OpenRequestCard
                      key={request.id}
                      request={request}
                      isSelected={request.id === selectedRequestId}
                      detailHref={buildRequestDetailHref(
                        request.id,
                        selectedCarrierRouteId,
                        selectedMaxSapmaKm
                      )}
                      selectedCarrierRouteId={selectedCarrierRouteId}
                      onCardClick={handleRequestCardClick}
                      cardRef={(node) => {
                        if (node) {
                          requestCardRefs.current.set(request.id, node);
                        } else {
                          requestCardRefs.current.delete(request.id);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CarrierVehiclesShell>
  );
}

// Suspense fallback ile searchParams kullanan client icerigi sarilir.
export default function OpenTransportRequestsPage() {
  return (
    <Suspense fallback={<OpenTransportRequestsPageFallback />}>
      <OpenTransportRequestsPageContent />
    </Suspense>
  );
}
