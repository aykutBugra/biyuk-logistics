"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import RouteCard from "@/components/RouteCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyCarrierRoutes,
  type CarrierRouteListItem,
} from "@/lib/api/carrier-routes";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

export default function CarrierRoutesPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [routes, setRoutes] = useState<CarrierRouteListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const routesWithDeviation = routes.filter(
    (route) => route.maksimumSapmaKm !== null
  ).length;
  const routesWithMetrics = routes.filter(
    (route) =>
      route.rotaMesafeMetre !== null && route.rotaSureSaniye !== null
  ).length;

  return (
    <CarrierVehiclesShell
      title="Rotalarim"
      description="Planladigin ana hatlari kaydet, sakla ve sonraki discovery fazi icin hazir tut."
      headerActions={
        <div className="flex items-center gap-3">
          <InlineHelpTrigger helpKey="routes" />
          <Link
            href="/dashboard/rotalarim/yeni"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <i className="pi pi-plus text-xs" />
            Yeni rota tanimla
          </Link>
        </div>
      }
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && routes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryStatCard label="Toplam rota" value={routes.length} />
          <SummaryStatCard label="Sapma tanimli" value={routesWithDeviation} />
          <SummaryStatCard label="Mesafe hazir" value={routesWithMetrics} />
        </div>
      ) : null}

      {!isLoading && !errorMessage && routes.length === 0 ? (
        <EmptyStateCard
          title="Henuz rota tanimi yok"
          description="Planladigin ana hatti bir kez tanimladiginda burada goreceksin. Bu bilgi mevcut discovery'yi bozmaz, sonraki route-aware faza temel olur."
          actionHref="/dashboard/rotalarim/yeni"
          actionLabel="Ilk rotayi tanimla"
        />
      ) : null}

      {!isLoading && !errorMessage && routes.length > 0 ? (
        <div className="grid gap-4">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
