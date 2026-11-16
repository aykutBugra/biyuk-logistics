"use client";

import type { ReactNode } from "react";
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
import { formatDateOnly } from "@/lib/date-only";
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
  return formatDateOnly(value, value);
}

function hasRouteCoordinates(route: CarrierRouteDetail): boolean {
  return [
    route.baslangicEnlem,
    route.baslangicBoylam,
    route.varisEnlem,
    route.varisBoylam,
  ].every((value) => Number.isFinite(value));
}

// Rota metrikleri ve koordinat durumuna gore detay sayfasinda status modeli olusturur.
function resolveRouteStatus(route: CarrierRouteDetail): {
  label: string;
  tone: "blue" | "emerald" | "amber";
  description: string;
} {
  if (hasRouteCoordinates(route)) {
    return {
      label: "Koordinat hazir",
      tone: "emerald",
      description: "Baslangic ve varis konumu eslesmis durumda.",
    };
  }

  if (route.rotaMesafeMetre !== null && route.rotaSureSaniye !== null) {
    return {
      label: "Mesafe hazir",
      tone: "blue",
      description: "Mesafe ve sure snapshot'i mevcut.",
    };
  }

  return {
    label: "Veri eksik",
    tone: "amber",
    description: "Rota metrikleri tamamlanmadigi icin detay kontrol edilmeli.",
  };
}

const STATUS_TONE_CLASSES = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
} satisfies Record<"blue" | "emerald" | "amber", string>;

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "emerald" | "amber";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

function MetricTile({
  label,
  value,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "blue" | "emerald" | "amber";
}) {
  return (
    <article className="app-surface-strong rounded-[1.2rem] border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${STATUS_TONE_CLASSES[tone]}`}
        >
          <i className={`${icon} text-sm`} />
        </span>
      </div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

// Tek rota kaydinin koordinat, metrik ve silme aksiyonlarini gosterir.
export default function CarrierRouteDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const [route, setRoute] = useState<CarrierRouteDetail | null>(null);
  const [loadErrorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDataLoading, setIsLoading] = useState(true);
  const hasValidId = Boolean(routeId.trim());
  const isLoading = hasValidId && isDataLoading;
  const errorMessage = hasValidId ? loadErrorMessage : "Gecersiz rota numarasi.";
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Route id ve token dogrulanmadan detay endpoint'i cagrilmaz.
    if (status !== "ready" || !accessToken) {
      return;
    }

    if (!routeId.trim()) {
      return;
    }

    let isMounted = true;

    const loadRoute = async () => {
      try {
        // Detay endpoint'i konum provider/place id ve koordinatlari da dondurur.
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

  // Kullanici onay verirse rota silinir ve liste ekranina donulur.
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
      // Auth/rol hatasinda kullanici stale detay ekraninda tutulmaz.
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

  // Carrier guard sonuclanana kadar detay shell'i bekletilir.
  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const routeStatus = route ? resolveRouteStatus(route) : null;
  const routeTitle = route
    ? `${formatLocationLabel(route.baslangicKonumMetni, route.baslangicSehri)} -> ${formatLocationLabel(route.varisKonumMetni, route.varisSehri)}`
    : "";

  return (
    <CarrierVehiclesShell
      title="Rota detayi"
      description="Kayitli ana hattin operasyonel ozetini, konum bilgilerini ve aksiyonlarini gor."
      headerVariant="compact"
      motionPreset="operational"
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          <h2 className="text-base font-bold text-red-800">Kayit goruntulenemedi</h2>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && route && routeStatus ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      Rota detayi
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {formatPlannedDate(route.planlananTarih)}
                    </span>
                    <StatusPill label={routeStatus.label} tone={routeStatus.tone} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 md:text-3xl">
                    {routeTitle}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Olusturma: {formatDateTime(route.olusturmaTarihi)}
                  </p>
                </div>

                <Link
                  href={`/dashboard/rotalarim/${route.id}/duzenle`}
                  className="app-pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <i className="pi pi-pencil text-xs" />
                  Rotayi duzenle
                </Link>
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-3">
              <MetricTile
                label="Mesafe"
                value={formatRouteDistanceKm(route.rotaMesafeMetre)}
                icon="pi pi-map-marker"
                tone="blue"
              />
              <MetricTile
                label="Sure"
                value={formatRouteDuration(route.rotaSureSaniye)}
                icon="pi pi-clock"
                tone="emerald"
              />
              <MetricTile
                label="Plan"
                value={formatPlannedDate(route.planlananTarih)}
                icon="pi pi-calendar"
                tone="amber"
              />
            </div>

            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-950">Guzergah bilgileri</h2>
                <p className="text-sm leading-6 text-slate-500">
                  Baslangic ve varis kaydindan gelen normalize konum bilgileri.
                </p>
              </div>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Baslangic</h3>
                  <dl className="mt-3">
                    <InfoRow
                      label="Konum"
                      value={formatLocationLabel(
                        route.baslangicKonumMetni,
                        route.baslangicSehri
                      )}
                    />
                    <InfoRow
                      label="Sehir"
                      value={route.normalizeBaslangicSehir || route.baslangicSehri}
                    />
                    {route.normalizeBaslangicIlce ? (
                      <InfoRow label="Ilce" value={route.normalizeBaslangicIlce} />
                    ) : null}
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-950">Varis</h3>
                  <dl className="mt-3">
                    <InfoRow
                      label="Konum"
                      value={formatLocationLabel(route.varisKonumMetni, route.varisSehri)}
                    />
                    <InfoRow
                      label="Sehir"
                      value={route.normalizeVarisSehir || route.varisSehri}
                    />
                    {route.normalizeVarisIlce ? (
                      <InfoRow label="Ilce" value={route.normalizeVarisIlce} />
                    ) : null}
                  </dl>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">Durum</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {routeStatus.description}
                  </p>
                </div>
                <StatusPill label={routeStatus.label} tone={routeStatus.tone} />
              </div>
              <dl className="mt-4">
                <InfoRow
                  label="Koordinat"
                  value={hasRouteCoordinates(route) ? "Hazir" : "Eksik"}
                />
                <InfoRow
                  label="Mesafe-sure"
                  value={
                    route.rotaMesafeMetre !== null && route.rotaSureSaniye !== null
                      ? "Hazir"
                      : "Eksik"
                  }
                />
                <InfoRow label="Kayit" value={formatDateTime(route.olusturmaTarihi)} />
              </dl>
            </section>

            <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
              <h2 className="text-sm font-black text-slate-950">Hizli aksiyonlar</h2>
              <div className="mt-3 grid gap-2">
                <Link
                  href="/dashboard/acik_istekler"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <span className="flex items-center gap-2">
                    <i className="pi pi-search text-xs text-slate-400" />
                    Acik istekleri kesfet
                  </span>
                  <i className="pi pi-angle-right text-xs text-slate-400" />
                </Link>
                <Link
                  href="/dashboard/rotalarim"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <span className="flex items-center gap-2">
                    <i className="pi pi-list text-xs text-slate-400" />
                    Rotalarima don
                  </span>
                  <i className="pi pi-angle-right text-xs text-slate-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/70 px-3.5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <i className="pi pi-trash text-xs" />
                    {isDeleting ? "Siliniyor..." : "Rotayi sil"}
                  </span>
                </button>
              </div>
            </section>

            <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
                  <i className="pi pi-info-circle text-sm" />
                </span>
                <p className="text-sm leading-6 text-slate-600">
                  Sapma limiti bu detay ekraninda degistirilmez. Rota secimiyle
                  kesif yapmak icin Acik Istekler ekranini kullan.
                </p>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
