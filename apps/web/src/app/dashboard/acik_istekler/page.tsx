"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

function parsePositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildCarrierRouteSelectionPath(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
  carrierRouteId: number | null
): string {
  const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");

  if (carrierRouteId === null) {
    nextSearchParams.delete("carrierRouteId");
  } else {
    nextSearchParams.set("carrierRouteId", String(carrierRouteId));
  }

  const nextQuery = nextSearchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildRequestDetailHref(
  requestId: number,
  carrierRouteId: number | null
): string {
  if (carrierRouteId === null) {
    return `/dashboard/acik_istekler/${requestId}`;
  }

  return `/dashboard/acik_istekler/${requestId}?carrierRouteId=${carrierRouteId}`;
}

function toApiFilters(
  values: CarrierDiscoveryFilterForm,
  carrierRouteId: number | null
): OpenOfferRequestFilters {
  return {
    carrierRouteId: carrierRouteId ?? undefined,
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

function hasRenderableRequestCoordinates(request: OpenOfferRequestListItem): boolean {
  return (
    Number.isFinite(request.baslangicEnlem) &&
    Number.isFinite(request.baslangicBoylam) &&
    Number.isFinite(request.varisEnlem) &&
    Number.isFinite(request.varisBoylam)
  );
}

function buildRouteDeviationOptions(maxDeviationKm: number | null): number[] {
  const fallback = maxDeviationKm !== null && maxDeviationKm > 0 ? maxDeviationKm : 20;
  const normalized = Math.max(5, Math.round(fallback));
  const baseOptions = [10, 25, 50, 100, 150].filter((value) => value < normalized);
  const options = new Set<number>(baseOptions);
  options.add(normalized);
  return Array.from(options).sort((left, right) => left - right);
}

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

function OpenTransportRequestsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken, status } = useCarrierPageAccess();
  const selectedCarrierRouteId = parsePositiveInteger(
    searchParams?.get("carrierRouteId") ?? null
  );
  const requestCardRefs = useRef(new Map<number, HTMLDivElement | null>());
  const [filters, setFilters] = useState<CarrierDiscoveryFilterForm>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<CarrierDiscoveryFilterForm>(initialFilters);
  const [requests, setRequests] = useState<OpenOfferRequestListItem[]>([]);
  const [routes, setRoutes] = useState<CarrierRouteListItem[]>([]);
  const [selectedCarrierRouteDetail, setSelectedCarrierRouteDetail] =
    useState<CarrierRouteDetail | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeErrorMessage, setRouteErrorMessage] = useState<string | null>(null);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [isRoutesLoading, setIsRoutesLoading] = useState(true);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [hasMountedMap, setHasMountedMap] = useState(false);
  const [hasLoadedRequestsOnce, setHasLoadedRequestsOnce] = useState(false);
  const [sortMode, setSortMode] = useState<DiscoverySortMode>("recommended");
  const [routeDeviationRefinementKm, setRouteDeviationRefinementKm] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldOpenMap = window.matchMedia("(min-width: 1024px)").matches;
    setIsMapVisible(shouldOpenMap);
    setHasMountedMap(shouldOpenMap);
  }, []);

  useEffect(() => {
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
            buildCarrierRouteSelectionPath(pathname, searchParams, null)
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
    if (status !== "ready" || !accessToken) {
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
          toApiFilters(appliedFilters, selectedCarrierRouteId)
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
            buildCarrierRouteSelectionPath(pathname, searchParams, null)
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
    status,
  ]);

  const selectedCarrierRoute =
    routes.find((route) => route.id === selectedCarrierRouteId) ?? null;
  const hasRouteContext = selectedCarrierRouteId !== null;
  const effectiveMaxSapmaKm =
    hasRouteContext && selectedCarrierRoute
      ? selectedCarrierRoute.maksimumSapmaKm ?? 20
      : null;
  const routeDeviationOptions =
    hasRouteContext && selectedCarrierRoute
      ? buildRouteDeviationOptions(effectiveMaxSapmaKm)
      : [];

  const refinedRequests = useMemo(() => {
    const routeRefinedRequests =
      hasRouteContext && routeDeviationRefinementKm !== null
        ? requests.filter((request) => {
            const extraDistance = request.rotaUyumu?.extraMesafeMetre;
            if (typeof extraDistance !== "number") {
              return false;
            }

            return extraDistance / 1000 <= routeDeviationRefinementKm;
          })
        : requests;

    return sortRequests(routeRefinedRequests, sortMode, hasRouteContext);
  }, [hasRouteContext, requests, routeDeviationRefinementKm, sortMode]);

  useEffect(() => {
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
    if (!isMapVisible || selectedRequestId !== null || refinedRequests.length === 0) {
      return;
    }

    setSelectedRequestId(refinedRequests[0].id);
  }, [isMapVisible, refinedRequests, selectedRequestId]);

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const handleCityFilterChange = (
    field: "baslangicSehir" | "varisSehir",
    value: string
  ) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedRequestId(null);
    setRouteDeviationRefinementKm(null);
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setSelectedRequestId(null);
    setRouteDeviationRefinementKm(null);
  };

  const handleCarrierRouteChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCarrierRouteId = parsePositiveInteger(event.target.value);
    setSelectedRequestId(null);
    setRouteDeviationRefinementKm(null);

    router.replace(
      buildCarrierRouteSelectionPath(pathname, searchParams, nextCarrierRouteId)
    );
  };

  const handleRequestCardClick = (requestId: number) => {
    setSelectedRequestId(requestId);
  };

  const handleRequestMarkerSelect = (requestId: number) => {
    setSelectedRequestId(requestId);

    const requestCardElement = requestCardRefs.current.get(requestId);
    requestCardElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

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
  const activeRefinementLabel =
    routeDeviationRefinementKm !== null ? `Ek sapma <= ${routeDeviationRefinementKm} km` : undefined;
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
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
            Max {effectiveMaxSapmaKm ?? 20} km
          </span>
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
            effectiveMaxSapmaKm={effectiveMaxSapmaKm}
            routeDeviationRefinementKm={routeDeviationRefinementKm}
            routeDeviationOptions={routeDeviationOptions}
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
            onRouteDeviationChange={(value) => {
              setRouteDeviationRefinementKm(value);
              setSelectedRequestId(null);
            }}
          />

          <div data-dashboard-primary className="space-y-3">
            {hasMountedMap ? (
              <MotionCollapse isOpen={isMapVisible}>
                <OpenRequestsMapPanel
                  requests={refinedRequests}
                  selectedCarrierRoute={selectedCarrierRouteDetail}
                  selectedRequestId={selectedRequestId}
                  onRequestSelect={handleRequestMarkerSelect}
                  isVisible={isMapVisible}
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
              activeRefinementLabel={activeRefinementLabel}
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
                        selectedCarrierRouteId
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

export default function OpenTransportRequestsPage() {
  return (
    <Suspense fallback={<OpenTransportRequestsPageFallback />}>
      <OpenTransportRequestsPageContent />
    </Suspense>
  );
}
