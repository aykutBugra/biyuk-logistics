"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierMetricCard from "@/components/CarrierMetricCard";
import CarrierQuickActionsPanel from "@/components/CarrierQuickActionsPanel";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import RouteCard, { type RouteCardModel } from "@/components/RouteCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getCarrierRouteDetail,
  getMyCarrierRoutes,
  type CarrierRouteDetail,
  type CarrierRouteListItem,
} from "@/lib/api/carrier-routes";
import { getOpenOfferRequests, type OpenOfferRequestListItem } from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
} from "@/lib/logistics";

type RouteFilterTab =
  | "all"
  | "distance-ready"
  | "coordinate-ready"
  | "incomplete";
type RouteSortMode = "newest" | "oldest" | "distance-desc" | "distance-asc";
type RouteReadinessKey = Exclude<RouteFilterTab, "all">;

type RouteViewModel = RouteCardModel & {
  searchText: string;
  createdSortValue: number;
  distanceSortValue: number | null;
  readinessKey: RouteReadinessKey;
};

const DEFAULT_ROUTE_MATCH_DEVIATION_KM = 50;
const FILTER_TABS: Array<{
  key: RouteFilterTab;
  label: string;
}> = [
  { key: "all", label: "Tumu" },
  { key: "distance-ready", label: "Mesafe hazir" },
  { key: "coordinate-ready", label: "Koordinat hazir" },
  { key: "incomplete", label: "Veri eksik" },
];

function formatDateTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatPlanningDate(value: string): string {
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(parsedDate);
}

function hasDistanceMetrics(route: CarrierRouteListItem): boolean {
  return route.rotaMesafeMetre !== null && route.rotaSureSaniye !== null;
}

function hasCoordinates(detail: CarrierRouteDetail | null | undefined): boolean {
  if (!detail) {
    return false;
  }

  return [
    detail.baslangicEnlem,
    detail.baslangicBoylam,
    detail.varisEnlem,
    detail.varisBoylam,
  ].every((value) => Number.isFinite(value));
}

function resolveRouteReadiness(
  route: CarrierRouteListItem,
  detail: CarrierRouteDetail | null | undefined
): {
  key: RouteReadinessKey;
  label: string;
  tone: RouteCardModel["durumTonu"];
  description: string;
} {
  if (hasCoordinates(detail)) {
    return {
      key: "coordinate-ready",
      label: "Koordinat hazir",
      tone: "emerald",
      description:
        "Konum eslestirmesi tamam. Kesif ve uygun acik istek taramasi icin en hazir rota.",
    };
  }

  if (hasDistanceMetrics(route)) {
    return {
      key: "distance-ready",
      label: "Mesafe hazir",
      tone: "blue",
      description:
        "Mesafe ve sure bilgisi var. Konum butunlugu geldikce rota eslestirmesi daha net okunur.",
    };
  }

  return {
    key: "incomplete",
    label: "Veri eksik",
    tone: "amber",
    description:
      "Bu kayitta mesafe veya koordinat bilgisi eksik. Duzenle ekranindan rotayi tamamlaman gerekir.",
  };
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc"
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === "asc" ? left - right : right - left;
}

function Toolbar(props: {
  searchQuery: string;
  activeTab: RouteFilterTab;
  sortMode: RouteSortMode;
  totalCount: number;
  isRefreshingInsights: boolean;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTabChange: (tab: RouteFilterTab) => void;
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
            placeholder="Sehir, konum veya rota etiketi ara"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
          />
        </div>

        <select
          value={props.sortMode}
          onChange={props.onSortChange}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300"
        >
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
          <option value="distance-desc">Mesafe uzun</option>
          <option value="distance-asc">Mesafe kisa</option>
        </select>
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
          <span>{props.totalCount} rota goruntuleniyor</span>
          {props.isRefreshingInsights ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              Kesif ozeti yenileniyor
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}


export default function CarrierRoutesPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [routes, setRoutes] = useState<CarrierRouteListItem[]>([]);
  const [routeDetailsById, setRouteDetailsById] = useState<
    Record<number, CarrierRouteDetail | null | undefined>
  >({});
  const [routeMatchesById, setRouteMatchesById] = useState<
    Record<number, OpenOfferRequestListItem[] | null | undefined>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<RouteFilterTab>("all");
  const [sortMode, setSortMode] = useState<RouteSortMode>("newest");
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

    const loadRoutes = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyCarrierRoutes(accessToken);

        if (!isMounted) {
          return;
        }

        setRoutes(response);
        setRouteDetailsById({});
        setRouteMatchesById({});
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
            : "Rotalar yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRoutes();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  useEffect(() => {
    if (status !== "ready" || !accessToken || routes.length === 0) {
      setIsEnriching(false);
      return;
    }

    const missingRoutes = routes.filter(
      (route) =>
        routeDetailsById[route.id] === undefined ||
        routeMatchesById[route.id] === undefined
    );

    if (missingRoutes.length === 0) {
      return;
    }

    let isMounted = true;

    const loadRouteInsights = async () => {
      try {
        setIsEnriching(true);

        const results = await Promise.all(
          missingRoutes.map(async (route) => {
            const maxSapmaKm =
              route.maksimumSapmaKm ?? DEFAULT_ROUTE_MATCH_DEVIATION_KM;
            const [detailResult, matchesResult] = await Promise.allSettled([
              getCarrierRouteDetail(route.id, accessToken),
              getOpenOfferRequests(accessToken, {
                carrierRouteId: route.id,
                maxSapmaKm,
              }),
            ]);

            return {
              routeId: route.id,
              detailResult,
              matchesResult,
            };
          })
        );

        if (!isMounted) {
          return;
        }

        const hasUnauthorized = results.some(({ detailResult, matchesResult }) => {
          return [detailResult, matchesResult].some(
            (result) =>
              result.status === "rejected" &&
              result.reason instanceof ApiClientError &&
              result.reason.status === 401
          );
        });

        if (hasUnauthorized) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        const hasForbidden = results.some(({ detailResult, matchesResult }) => {
          return [detailResult, matchesResult].some(
            (result) =>
              result.status === "rejected" &&
              result.reason instanceof ApiClientError &&
              result.reason.status === 403
          );
        });

        if (hasForbidden) {
          router.replace("/");
          return;
        }

        setRouteDetailsById((currentState) => {
          const nextState = { ...currentState };

          for (const result of results) {
            nextState[result.routeId] =
              result.detailResult.status === "fulfilled"
                ? result.detailResult.value
                : null;
          }

          return nextState;
        });

        setRouteMatchesById((currentState) => {
          const nextState = { ...currentState };

          for (const result of results) {
            nextState[result.routeId] =
              result.matchesResult.status === "fulfilled"
                ? result.matchesResult.value
                : null;
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

    void loadRouteInsights();

    return () => {
      isMounted = false;
    };
  }, [accessToken, routeDetailsById, routeMatchesById, routes, router, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const routeCards: RouteViewModel[] = routes.map((route) => {
    const detail = routeDetailsById[route.id];
    const matches = routeMatchesById[route.id];
    const readiness = resolveRouteReadiness(route, detail ?? null);
    const startLabel = formatLocationLabel(
      route.baslangicKonumMetni,
      route.baslangicSehri
    );
    const endLabel = formatLocationLabel(route.varisKonumMetni, route.varisSehri);
    const routeMeta =
      startLabel === route.baslangicSehri && endLabel === route.varisSehri
        ? null
        : `${route.baslangicSehri} -> ${route.varisSehri}`;

    let durumAciklamasi = readiness.description;
    let eslesmeBilgisi: string | null = null;

    if (matches === undefined) {
      eslesmeBilgisi = "Kesif ozeti hazirlaniyor";
    } else if (matches === null) {
      durumAciklamasi = `${readiness.description} Acik istek ozeti bu kayit icin simdilik alinamadi.`;
    } else if (matches.length > 0) {
      eslesmeBilgisi = `${matches.length} uygun acik istek`;
      durumAciklamasi = `${matches.length} acik istek bu rota ile eslesiyor. Detaydan rotayi acip kesif akisina gecis yapabilirsin.`;
    } else {
      eslesmeBilgisi = "0 uygun acik istek";
      durumAciklamasi = `${readiness.description} Su anda uygun acik istek gorunmuyor.`;
    }

    const searchText = [
      `Rota ${route.id}`,
      route.baslangicSehri,
      route.varisSehri,
      route.baslangicKonumMetni,
      route.varisKonumMetni,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    const chipler: RouteCardModel["chipler"] = [
      {
        label: formatPlanningDate(route.planlananTarih),
        tone: "blue",
      },
    ];

    if (route.rotaMesafeMetre !== null) {
      chipler.push({ label: formatRouteDistanceKm(route.rotaMesafeMetre) });
    }

    if (route.rotaSureSaniye !== null) {
      chipler.push({ label: formatRouteDuration(route.rotaSureSaniye) });
    }

    if (route.maksimumSapmaKm !== null) {
      chipler.push({
        label: `Maks. sapma ${route.maksimumSapmaKm} km`,
        tone: "amber",
      });
    }

    return {
      id: route.id,
      rotaBaslik: `${startLabel} -> ${endLabel}`,
      rotaDetay: routeMeta,
      durumEtiketi: readiness.label,
      durumTonu: readiness.tone,
      durumAciklamasi,
      olusturmaBilgisi: formatDateTime(route.olusturmaTarihi),
      eslesmeBilgisi,
      chipler,
      detailHref: `/dashboard/rotalarim/${route.id}`,
      editHref: `/dashboard/rotalarim/${route.id}/duzenle`,
      searchText,
      createdSortValue: new Date(route.olusturmaTarihi).getTime(),
      distanceSortValue: route.rotaMesafeMetre,
      readinessKey: readiness.key,
    };
  });

  const totalRoutes = routes.length;
  const distanceReadyCount = routes.filter((route) => hasDistanceMetrics(route)).length;
  const coordinateReadyCount = routes.filter((route) =>
    hasCoordinates(routeDetailsById[route.id] ?? null)
  ).length;
  const suitableOpenRequestCount = (() => {
    const uniqueRequestIds = new Set<number>();

    for (const value of Object.values(routeMatchesById)) {
      if (!Array.isArray(value)) {
        continue;
      }

      for (const request of value) {
        uniqueRequestIds.add(request.id);
      }
    }

    return uniqueRequestIds.size;
  })();

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredRoutes = routeCards.filter((route) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      route.searchText.includes(normalizedSearchQuery);

    if (!matchesSearch) {
      return false;
    }

    switch (activeTab) {
      case "distance-ready":
        return route.readinessKey === "distance-ready";
      case "coordinate-ready":
        return route.readinessKey === "coordinate-ready";
      case "incomplete":
        return route.readinessKey === "incomplete";
      default:
        return true;
    }
  });

  const sortedRoutes = [...filteredRoutes].sort((left, right) => {
    if (sortMode === "oldest") {
      return left.createdSortValue - right.createdSortValue;
    }

    if (sortMode === "distance-desc") {
      return compareNullableNumbers(
        left.distanceSortValue,
        right.distanceSortValue,
        "desc"
      );
    }

    if (sortMode === "distance-asc") {
      return compareNullableNumbers(
        left.distanceSortValue,
        right.distanceSortValue,
        "asc"
      );
    }

    return right.createdSortValue - left.createdSortValue;
  });

  const handleResetLocalFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortMode("newest");
  };

  return (
    <CarrierVehiclesShell
      title="Rotalarim"
      description="Planladigin ana hat rotalarini kaydet, takip et ve acik isteklerde kullan."
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={
        <div className="flex items-center gap-3">
          <InlineHelpTrigger helpKey="routes" />
          <Link
            href="/dashboard/rotalarim/yeni"
            className="app-pressable inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <i className="pi pi-plus text-xs" />
            Yeni rota tanimla
          </Link>
        </div>
      }
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
            <CarrierMetricCard
              label="Toplam rota"
              value={totalRoutes}
              hint="Kayitli ana hat"
              tone="blue"
              icon={<i className="pi pi-map-marker text-lg" />}
            />
            <CarrierMetricCard
              label="Mesafe hazir"
              value={distanceReadyCount}
              hint="Mesafe ve sure hesapli"
              tone="violet"
              icon={<i className="pi pi-compass text-lg" />}
            />
            <CarrierMetricCard
              label="Koordinat hazir"
              value={coordinateReadyCount}
              hint="Konum butunlugu tamam"
              tone="emerald"
              icon={<i className="pi pi-map text-lg" />}
            />
            <CarrierMetricCard
              label="Uygun acik istek"
              value={suitableOpenRequestCount}
              hint={
                isEnriching
                  ? "Kesif ozeti guncelleniyor"
                  : "Rotalara gore benzersiz acik istek"
              }
              tone="amber"
              icon={<i className="pi pi-briefcase text-lg" />}
            />
          </div>

          {routes.length === 0 ? (
            <div data-dashboard-primary>
              <EmptyStateCard
                title="Henuz kayitli rota yok"
                description="Planladigin ana hatti bir kez tanimladiginda burada goreceksin. Acik istekleri tararken ayni rotayi tekrar tekrar kurmana gerek kalmayacak."
                actionHref="/dashboard/rotalarim/yeni"
                actionLabel="Ilk rotayi tanimla"
              />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Toolbar
                  searchQuery={searchQuery}
                  activeTab={activeTab}
                  sortMode={sortMode}
                  totalCount={sortedRoutes.length}
                  isRefreshingInsights={isEnriching}
                  onSearchChange={(event) => setSearchQuery(event.target.value)}
                  onTabChange={setActiveTab}
                  onSortChange={(event) =>
                    setSortMode(event.target.value as RouteSortMode)
                  }
                />

                <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                            Kayitli rotalar
                          </h2>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {sortedRoutes.length}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Ana hatlarini tek listede oku, veri hazirlik seviyesini gor ve
                          kesfe hizli gecis yap.
                        </p>
                      </div>

                      {coordinateReadyCount > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {coordinateReadyCount} koordinat hazir rota
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    {sortedRoutes.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 p-6">
                        <p className="text-base font-semibold text-slate-900">
                          Bu filtrelerle eslesen rota bulunamadi
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                          Arama alanini temizleyerek veya hazirlik durumunu degistirerek tum
                          rota kayitlarini tekrar goruntule.
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
                        {sortedRoutes.map((route) => (
                          <RouteCard key={route.id} route={route} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <CarrierQuickActionsPanel />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
