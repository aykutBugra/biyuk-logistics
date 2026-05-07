"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  type ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CitySelectField from "@/components/CitySelectField";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MotionCollapse from "@/components/MotionCollapse";
import OpenRequestCard from "@/components/OpenRequestCard";
import OpenRequestsMapPanel from "@/components/OpenRequestsMapPanel";
import SummaryStatCard from "@/components/SummaryStatCard";
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
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  CARGO_TYPE_OPTIONS,
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
  hasActiveFilters,
} from "@/lib/logistics";
import { TURKEY_CITY_OPTIONS } from "@/lib/turkey-cities";

type DiscoveryFilterForm = {
  baslangicSehir: string;
  varisSehir: string;
  tekTasimaIstiyor: "all" | "true" | "false";
  minAgirlikKg: string;
  maxAgirlikKg: string;
  minHacimM3: string;
  maxHacimM3: string;
  yukTipi: string;
  tasimaTarihi: string;
};

type OpenRequestsFilterRailProps = {
  requestsCount: number;
  selectedCarrierRouteId: number | null;
  selectedCarrierRoute: CarrierRouteListItem | null;
  routes: CarrierRouteListItem[];
  isRoutesLoading: boolean;
  routeErrorMessage: string | null;
  filters: DiscoveryFilterForm;
  filtersActive: boolean;
  onFilterChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onApplyFilters: (event: FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onCarrierRouteChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBaslangicSehirChange: (value: string) => void;
  onVarisSehirChange: (value: string) => void;
};

const initialFilters: DiscoveryFilterForm = {
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
  values: DiscoveryFilterForm,
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

function OpenRequestsFilterRail({
  requestsCount,
  selectedCarrierRouteId,
  selectedCarrierRoute,
  routes,
  isRoutesLoading,
  routeErrorMessage,
  filters,
  filtersActive,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onCarrierRouteChange,
  onBaslangicSehirChange,
  onVarisSehirChange,
}: OpenRequestsFilterRailProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-[calc(var(--topbar-height)+1rem)]">
      <div className="app-surface rounded-[1.6rem] p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-black tracking-tight text-slate-950">
            Filtreler
          </h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {requestsCount} açık istek
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {selectedCarrierRouteId !== null
              ? "Rota seçili"
              : filtersActive
                ? "Filtreler aktif"
                : "Tüm kayıtlar"}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-white/80 p-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Rota seçimi
              </p>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="carrierRouteId"
              >
                Kayıtlı rota
              </label>
            </div>
            <select
              id="carrierRouteId"
              value={selectedCarrierRouteId ?? ""}
              onChange={onCarrierRouteChange}
              disabled={isRoutesLoading || Boolean(routeErrorMessage)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Rota seçmeden devam et</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.baslangicSehri} → {route.varisSehri} - {route.planlananTarih}
                </option>
              ))}
            </select>

            {isRoutesLoading ? (
              <p className="text-sm text-slate-500">Rotalar yükleniyor...</p>
            ) : null}

            {!isRoutesLoading && routeErrorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {routeErrorMessage}
              </div>
            ) : null}

            {!isRoutesLoading && !routeErrorMessage && routes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Henüz kayıtlı rota yok.{" "}
                <Link
                  href="/dashboard/rotalarim/yeni"
                  className="font-semibold text-blue-700 hover:text-blue-800"
                >
                  Yeni rota tanımla
                </Link>
              </div>
            ) : null}

            {!isRoutesLoading && !routeErrorMessage && selectedCarrierRoute ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Seçili rota
                  </p>
                  <p className="text-sm font-semibold text-slate-950">
                    {formatLocationLabel(
                      selectedCarrierRoute.baslangicKonumMetni,
                      selectedCarrierRoute.baslangicSehri
                    )}{" "}
                    →{" "}
                    {formatLocationLabel(
                      selectedCarrierRoute.varisKonumMetni,
                      selectedCarrierRoute.varisSehri
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-blue-100">
                      {formatPlannedDate(selectedCarrierRoute.planlananTarih)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-blue-100">
                      {formatRouteDistanceKm(selectedCarrierRoute.rotaMesafeMetre)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-blue-100">
                      {formatRouteDuration(selectedCarrierRoute.rotaSureSaniye)}
                    </span>
                    {selectedCarrierRoute.maksimumSapmaKm !== null ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-blue-100">
                        Max sapma {selectedCarrierRoute.maksimumSapmaKm.toFixed(1)} km
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={onApplyFilters} className="space-y-4">
            <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Konum ve tarih
              </p>
              <div className="space-y-4">
                <CitySelectField
                  id="baslangicSehir"
                  label="Başlangıç şehri"
                  options={TURKEY_CITY_OPTIONS}
                  placeholder="İl seç"
                  value={filters.baslangicSehir}
                  onChange={onBaslangicSehirChange}
                />
                <CitySelectField
                  id="varisSehir"
                  label="Varış şehri"
                  options={TURKEY_CITY_OPTIONS}
                  placeholder="İl seç"
                  value={filters.varisSehir}
                  onChange={onVarisSehirChange}
                />
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="tasimaTarihi"
                  >
                    Taşıma tarihi
                  </label>
                  <input
                    id="tasimaTarihi"
                    name="tasimaTarihi"
                    type="date"
                    value={filters.tasimaTarihi}
                    onChange={onFilterChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.35rem] border border-slate-200 bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Yük özellikleri
              </p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="yukTipi"
                  >
                    Yük tipi
                  </label>
                  <select
                    id="yukTipi"
                    name="yukTipi"
                    value={filters.yukTipi}
                    onChange={onFilterChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Tüm tipler</option>
                    {CARGO_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="tekTasimaIstiyor"
                  >
                    Tek taşıma
                  </label>
                  <select
                    id="tekTasimaIstiyor"
                    name="tekTasimaIstiyor"
                    value={filters.tekTasimaIstiyor}
                    onChange={onFilterChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">Hepsi</option>
                    <option value="true">Sadece tek taşıma</option>
                    <option value="false">Paylaşımlı olabilir</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      className="text-sm font-medium text-slate-700"
                      htmlFor="minAgirlikKg"
                    >
                      Min ağırlık (kg)
                    </label>
                    <input
                      id="minAgirlikKg"
                      name="minAgirlikKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minAgirlikKg}
                      onChange={onFilterChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-sm font-medium text-slate-700"
                      htmlFor="maxAgirlikKg"
                    >
                      Max ağırlık (kg)
                    </label>
                    <input
                      id="maxAgirlikKg"
                      name="maxAgirlikKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxAgirlikKg}
                      onChange={onFilterChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-sm font-medium text-slate-700"
                      htmlFor="minHacimM3"
                    >
                      Min hacim (m3)
                    </label>
                    <input
                      id="minHacimM3"
                      name="minHacimM3"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minHacimM3}
                      onChange={onFilterChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-sm font-medium text-slate-700"
                      htmlFor="maxHacimM3"
                    >
                      Max hacim (m3)
                    </label>
                    <input
                      id="maxHacimM3"
                      name="maxHacimM3"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxHacimM3}
                      onChange={onFilterChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="app-button-primary text-sm">
                Filtreleri uygula
              </button>
              <button
                type="button"
                onClick={onResetFilters}
                className="app-button-secondary text-sm"
              >
                Temizle
              </button>
            </div>
          </form>
        </div>
      </div>
    </aside>
  );
}

function OpenTransportRequestsPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="font-medium text-gray-600">Yükleniyor...</div>
    </div>
  );
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
  const [filters, setFilters] = useState<DiscoveryFilterForm>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<DiscoveryFilterForm>(initialFilters);
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
            : "Rota listesi yüklenirken beklenmeyen bir hata oluştu."
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
          setErrorMessage("Seçili rota filtresi şu anda uygulanamıyor.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Açık istekler yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

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

  useEffect(() => {
    if (selectedRequestId === null) {
      return;
    }

    const requestStillVisible = requests.some(
      (request) => request.id === selectedRequestId
    );

    if (!requestStillVisible) {
      setSelectedRequestId(null);
    }
  }, [requests, selectedRequestId]);

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
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const handleCarrierRouteChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCarrierRouteId = parsePositiveInteger(event.target.value);
    setSelectedRequestId(null);

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

  if (status !== "ready") {
    return <OpenTransportRequestsPageFallback />;
  }

  const selectedCarrierRoute =
    routes.find((route) => route.id === selectedCarrierRouteId) ?? null;
  const alreadyOfferedCount = requests.filter(
    (request) => request.alreadyOffered
  ).length;
  const freshOpportunityCount = requests.length - alreadyOfferedCount;
  const filtersActive = hasActiveFilters({
    ...appliedFilters,
    tekTasimaIstiyor:
      appliedFilters.tekTasimaIstiyor === "all"
        ? ""
        : appliedFilters.tekTasimaIstiyor,
  });

  return (
    <CarrierVehiclesShell
      title="Açık İstekler"
      description="Uygun taşıma taleplerini keşfet."
      headerActions={<InlineHelpTrigger helpKey="open-requests" />}
      headerVariant="compact"
    >
      {isRequestsLoading ? <DashboardPageSkeleton /> : null}

      {!isRequestsLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage ? (
        <>
          <div className="grid gap-3 md:grid-cols-3 mb-6">
            <SummaryStatCard label="Açık İstek" value={requests.length} density="compact" />
            <SummaryStatCard
              label="Yeni Fırsat"
              value={freshOpportunityCount}
              density="compact"
            />
            <SummaryStatCard
              label="Takip Ettiğin"
              value={alreadyOfferedCount}
              density="compact"
            />
          </div>

          {!isRequestsLoading ? (
            <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
              <OpenRequestsFilterRail
                requestsCount={requests.length}
                selectedCarrierRouteId={selectedCarrierRouteId}
                selectedCarrierRoute={selectedCarrierRoute}
                routes={routes}
                isRoutesLoading={isRoutesLoading}
                routeErrorMessage={routeErrorMessage}
                filters={filters}
                filtersActive={filtersActive}
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
              />

              <div className="space-y-4">
                <div className="app-surface rounded-[1.5rem] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black tracking-tight text-slate-950">
                        Harita
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        Alış
                      </span>
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
                        Teslim
                      </span>
                      {selectedCarrierRouteDetail ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                          Rota
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setIsMapVisible((currentValue) => {
                          const nextValue = !currentValue;

                          if (nextValue) {
                            setHasMountedMap(true);
                          }

                          return nextValue;
                        })
                      }
                      className="app-button-secondary text-sm"
                    >
                      {isMapVisible ? "Haritayı Gizle" : "Haritayı Göster"}
                    </button>
                  </div>
                </div>

                {hasMountedMap ? (
                  <MotionCollapse isOpen={isMapVisible}>
                    <OpenRequestsMapPanel
                      requests={requests}
                      selectedCarrierRoute={selectedCarrierRouteDetail}
                      selectedRequestId={selectedRequestId}
                      onRequestSelect={handleRequestMarkerSelect}
                      hideHeader
                      isVisible={isMapVisible}
                    />
                  </MotionCollapse>
                ) : null}

                {requests.length === 0 ? (
                  <EmptyStateCard
                    title="Uygun istek bulunmuyor"
                    description={
                      selectedCarrierRouteId !== null
                        ? "Seçili rota ve mevcut filtrelerle eşleşen istek bulunmuyor."
                        : filtersActive
                          ? "Bu filtrelerle eşleşen bir taşıma talebi yok."
                          : "Şu anda teklif vermeye açık bir taşıma talebi yok."
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black tracking-tight text-slate-950">
                          İstekler
                        </h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {requests.length} kayıt
                        </span>
                      </div>
                      {selectedCarrierRouteId !== null ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Rota filtresi aktif
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-4">
                      {requests.map((request) => (
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
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
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
