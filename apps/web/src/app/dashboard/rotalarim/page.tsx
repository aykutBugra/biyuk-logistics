"use client";

import CompactDetailLayout from "@/components/CompactDetailLayout";

import RoutesWorkspace from "@/features/carrier-workspace/RoutesWorkspace";
import { LinkButton } from "@/components/ui";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";

import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { type RouteCardModel } from "@/components/RouteCard";
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
import { formatDateOnly } from "@/lib/date-only";
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
  return formatDateOnly(value, value);
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
        "Konum eslestirmesi tamam. Kesif ve uygun açık talep taramasi için en hazir rota.",
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

export default function CarrierRoutesPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [routes, setRoutes] = useState<CarrierRouteListItem[]>([]);
  const [routeDetailsById, setRouteDetailsById] = useState<
    Record<string, CarrierRouteDetail | null | undefined>
  >({});
  const [routeMatchesById, setRouteMatchesById] = useState<
    Record<string, OpenOfferRequestListItem[] | null | undefined>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<RouteFilterTab>("all");
  const [sortMode, setSortMode] = useState<RouteSortMode>("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrichmentPending, setIsEnriching] = useState(false);
  const isEnriching =
    status === "ready" &&
    Boolean(accessToken) &&
    routes.length > 0 &&
    isEnrichmentPending;

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
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
      durumAciklamasi = `${readiness.description} Açık talep ozeti bu kayit için simdilik alinamadi.`;
    } else if (matches.length > 0) {
      eslesmeBilgisi = `${matches.length} uygun açık talep`;
      durumAciklamasi = `${matches.length} açık talep bu rota ile eslesiyor. Detaydan rotayi acip kesif akisina gecis yapabilirsin.`;
    } else {
      eslesmeBilgisi = "0 uygun açık talep";
      durumAciklamasi = `${readiness.description} Su anda uygun açık talep gorunmuyor.`;
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
    const uniqueRequestIds = new Set<string>();

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
    <CompactDetailLayout>
<CarrierVehiclesShell title="Rotalarım" description="Kayıtlı ana hatlarınızı ve yük eşleşmelerini yönetin."
      headerVariant="compact" motionPreset="operational" cardMotionLimit={6}
      headerActions={<div className="flex flex-wrap items-center gap-3"><InlineHelpTrigger helpKey="routes" /><LinkButton href="/dashboard/rotalarim/yeni" variant="primary"><i className="pi pi-plus" aria-hidden="true" />Yeni rota</LinkButton></div>}>
      <RoutesWorkspace items={sortedRoutes} totalCount={totalRoutes} isEnriching={isEnriching}
        isLoading={isLoading} errorMessage={errorMessage} query={searchQuery} filter={activeTab} sort={sortMode}
        onQueryChange={setSearchQuery} onFilterChange={setActiveTab} onSortChange={setSortMode} onReset={handleResetLocalFilters}
        metrics={[
          { label: "Toplam rota", value: totalRoutes, description: "Kayıtlı ana hatlar" },
          { label: "Mesafe / süre bilgili", value: distanceReadyCount, description: "Mesafe ve süresi bulunan rota" },
          { label: "Koordinatlı", value: coordinateReadyCount, description: "Konum bilgileri bulunan rota" },
          { label: "Eşleşen açık talep", value: isEnriching || (totalRoutes > 0 && !Object.values(routeMatchesById).some(Array.isArray)) ? "—" : suitableOpenRequestCount, description: isEnriching ? "Yük eşleşmeleri yükleniyor" : "Alınabilen özetlerde benzersiz talep" },
        ]} />
    </CarrierVehiclesShell>
</CompactDetailLayout>
  );
}
