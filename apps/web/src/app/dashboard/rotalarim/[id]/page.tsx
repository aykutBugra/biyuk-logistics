"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteCarrierRoute,
  getCarrierRouteDetail,
  type CarrierRouteDetail,
} from "@/lib/api/carrier-routes";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
} from "@/lib/logistics";
import { useToast } from "@/lib/toast/toast-context";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPlannedDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

export default function CarrierRouteDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const params = useParams<{ id: string }>();
  const routeId = Number(params.id);
  const [route, setRoute] = useState<CarrierRouteDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!Number.isInteger(routeId) || routeId <= 0) {
      setErrorMessage("Gecersiz rota numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRoute = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getCarrierRouteDetail(routeId, accessToken);

        if (!isMounted) {
          return;
        }

        setRoute(response);
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

        if (error instanceof ApiClientError && error.status === 404) {
          setErrorMessage("Bu rota bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Rota detayi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRoute();

    return () => {
      isMounted = false;
    };
  }, [accessToken, routeId, router, status]);

  const handleDelete = async () => {
    if (!accessToken || !route || isDeleting) {
      return;
    }

    const isConfirmed = await confirm({
      title: "Rotayi sil",
      message: "Bu rotayi silmek istedigine emin misin?",
      tone: "danger",
      confirmLabel: "Sil",
      cancelLabel: "Vazgec",
      defaultFocus: "reject",
      dismissableMask: false,
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteCarrierRoute(route.id, accessToken);
      showToast({
        severity: "success",
        summary: "Rota silindi",
        detail: "Rota listeden kaldirildi.",
      });
      router.replace("/dashboard/rotalarim");
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        showToast({
          severity: "error",
          summary: "Oturum sona erdi",
          detail: "Lutfen yeniden giris yapin.",
          life: 3400,
          closable: true,
        });
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        showToast({
          severity: "error",
          summary: "Yetki yok",
          detail: "Bu islem icin yetkin yok.",
          life: 3400,
          closable: true,
        });
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        showToast({
          severity: "warn",
          summary: "Rota bulunamadi",
          detail: "Listeye yonlendiriliyorsun.",
          life: 3200,
          closable: true,
        });
        router.replace("/dashboard/rotalarim");
        return;
      }

      showToast({
        severity: "error",
        summary: "Rota silinemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Rota silinirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell title="Rota detayi">
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          <h2 className="text-base font-bold text-red-800">Kayit goruntulenemedi</h2>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && route ? (
        <div className="grid gap-6">
          {/* Identity header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    Rota #{route.id}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatPlannedDate(route.planlananTarih)}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {formatLocationLabel(
                    route.baslangicKonumMetni,
                    route.baslangicSehri
                  )}{" "}
                  →{" "}
                  {formatLocationLabel(route.varisKonumMetni, route.varisSehri)}
                </h2>
                <p className="text-xs text-slate-400">
                  {formatDateTime(route.olusturmaTarihi)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/rotalarim/${route.id}/duzenle`}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Rotayi Duzenle
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="text-sm font-semibold text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Siliniyor..." : "Rotayi Sil"}
                </button>
              </div>
            </div>
          </div>

          {/* Metrics cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Mesafe
              </h3>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                {formatRouteDistanceKm(route.rotaMesafeMetre)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sure
              </h3>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                {formatRouteDuration(route.rotaSureSaniye)}
              </p>
            </div>
          </div>

          {/* Location detail cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Baslangic</h3>
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">Konum</dt>
                  <dd className="text-right">
                    {formatLocationLabel(
                      route.baslangicKonumMetni,
                      route.baslangicSehri
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">Sehir</dt>
                  <dd>{route.normalizeBaslangicSehir || route.baslangicSehri}</dd>
                </div>
                {route.normalizeBaslangicIlce ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-slate-900">Ilce</dt>
                    <dd>{route.normalizeBaslangicIlce}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Varis</h3>
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">Konum</dt>
                  <dd className="text-right">
                    {formatLocationLabel(route.varisKonumMetni, route.varisSehri)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">Sehir</dt>
                  <dd>{route.normalizeVarisSehir || route.varisSehri}</dd>
                </div>
                {route.normalizeVarisIlce ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-slate-900">Ilce</dt>
                    <dd>{route.normalizeVarisIlce}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
