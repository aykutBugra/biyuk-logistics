"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteVehicle,
  getVehicleDetail,
  type VehicleDetail,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import {
  formatDimensionsCm,
  formatVolumeM3,
  formatWeightKg,
  getVehicleBodyTypeLabel,
} from "@/lib/logistics";
import { useToast } from "@/lib/toast/toast-context";

type VehicleStatusTone = "blue" | "emerald" | "amber" | "rose";

const STATUS_TONE_CLASSES = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
} satisfies Record<VehicleStatusTone, string>;

function calculateVehicleUsageRatio(vehicle: VehicleDetail): number {
  const weightBase =
    vehicle.capacitySummary.toplamAgirlikKg > 0
      ? vehicle.capacitySummary.rezerveAgirlikKg /
        vehicle.capacitySummary.toplamAgirlikKg
      : 0;
  const volumeBase =
    vehicle.capacitySummary.toplamHacimM3 &&
    vehicle.capacitySummary.toplamHacimM3 > 0
      ? vehicle.capacitySummary.rezerveHacimM3 /
        vehicle.capacitySummary.toplamHacimM3
      : 0;

  return Math.max(weightBase, volumeBase, 0) * 100;
}

function resolveVehicleStatus(vehicle: VehicleDetail): {
  label: string;
  tone: VehicleStatusTone;
  description: string;
} {
  if (vehicle.capacitySummary.hesapEksigiVar) {
    return {
      label: "Eksik bilgi",
      tone: "amber",
      description: "Kapasite ozeti eksik kayitlar nedeniyle yaklasik okunmali.",
    };
  }

  if (vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar) {
    return {
      label: "Tek tasima",
      tone: "rose",
      description: "Aktif tek tasima rezervasyonu bu aracin kullanimini sinirliyor.",
    };
  }

  if (vehicle.capacitySummary.aktifRezervasyonSayisi > 0) {
    return {
      label: "Rezerve",
      tone: "blue",
      description: "Aktif rezervasyonlar bu aracin kapasitesini kullaniyor.",
    };
  }

  return {
    label: "Musait",
    tone: "emerald",
    description: "Arac yeni eslesme ve teklif planlamasi icin uygun gorunuyor.",
  };
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: VehicleStatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

function CapacityTile({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone?: VehicleStatusTone;
}) {
  return (
    <article className="app-surface-strong rounded-[1.2rem] border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{hint}</p>
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

export default function VehicleDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params.id);
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
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

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      setErrorMessage("Gecersiz arac numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadVehicle = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getVehicleDetail(vehicleId, accessToken);

        if (!isMounted) {
          return;
        }

        setVehicle(response);
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
          setErrorMessage("Bu arac bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Arac detayi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadVehicle();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status, vehicleId]);

  const handleDelete = async () => {
    if (!accessToken || !vehicle || isDeleting) {
      return;
    }

    const isConfirmed = await confirm({
      title: "Araci sil",
      message: "Bu araci silmek istedigine emin misin?",
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
      await deleteVehicle(vehicle.id, accessToken);
      showToast({
        severity: "success",
        summary: "Arac silindi",
        detail: "Arac filodan kaldirildi.",
      });
      router.replace("/dashboard/araclarim");
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
          summary: "Arac bulunamadi",
          detail: "Listeye yonlendiriliyorsun.",
          life: 3200,
          closable: true,
        });
        router.replace("/dashboard/araclarim");
        return;
      }

      showToast({
        severity: "error",
        summary: "Arac silinemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Arac silinirken beklenmeyen bir hata olustu.",
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

  const vehicleStatus = vehicle ? resolveVehicleStatus(vehicle) : null;
  const usageRatio = vehicle ? Math.min(calculateVehicleUsageRatio(vehicle), 100) : 0;

  return (
    <CarrierVehiclesShell
      title="Arac detayi"
      description="Aracin kapasite, kasa ve operasyon durumunu tek ekranda takip et."
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

      {!isLoading && !errorMessage && vehicle && vehicleStatus ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      {vehicle.plaka}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Arac #{vehicle.id}
                    </span>
                    <StatusPill label={vehicleStatus.label} tone={vehicleStatus.tone} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 md:text-3xl">
                    {vehicle.marka} {vehicle.model}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {getVehicleBodyTypeLabel(vehicle.kasaTipi)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {vehicle.yil} model
                    </span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
                  className="app-pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <i className="pi pi-pencil text-xs" />
                  Araci duzenle
                </Link>
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <CapacityTile
                label="Maks. agirlik"
                value={formatWeightKg(vehicle.maksimumAgirlikKg)}
                hint="Tanimli yuk kapasitesi"
                icon="pi pi-box"
                tone="blue"
              />
              <CapacityTile
                label="Maks. hacim"
                value={formatVolumeM3(vehicle.maksimumHacimM3)}
                hint="Tanimli hacim kapasitesi"
                icon="pi pi-clone"
                tone="emerald"
              />
              <CapacityTile
                label="Rezerve"
                value={formatWeightKg(vehicle.capacitySummary.rezerveAgirlikKg)}
                hint={formatVolumeM3(vehicle.capacitySummary.rezerveHacimM3)}
                icon="pi pi-lock"
                tone={vehicle.capacitySummary.aktifRezervasyonSayisi > 0 ? "amber" : "blue"}
              />
              <CapacityTile
                label="Kalan"
                value={formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg)}
                hint={formatVolumeM3(vehicle.capacitySummary.kalanHacimM3)}
                icon="pi pi-check-circle"
                tone="emerald"
              />
            </div>

            {vehicle.capacitySummary.hesapEksigiVar ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Kapasite ozeti eksik kayitlar nedeniyle kesin yorum degildir.
              </div>
            ) : null}

            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-950">Arac bilgileri</h2>
                <p className="text-sm leading-6 text-slate-500">
                  Kimlik, kasa ve yukleme olculeri tek blokta okunur.
                </p>
              </div>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Temel bilgiler</h3>
                  <dl className="mt-3">
                    <InfoRow label="Marka" value={vehicle.marka} />
                    <InfoRow label="Model" value={vehicle.model} />
                    <InfoRow label="Plaka" value={vehicle.plaka} />
                    <InfoRow label="Yil" value={vehicle.yil} />
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-950">Kasa ve yukleme</h3>
                  <dl className="mt-3">
                    <InfoRow label="Kasa tipi" value={getVehicleBodyTypeLabel(vehicle.kasaTipi)} />
                    <InfoRow label="Yukleme alani" value={formatDimensionsCm(vehicle)} />
                    <InfoRow
                      label="Toplam agirlik"
                      value={formatWeightKg(vehicle.capacitySummary.toplamAgirlikKg)}
                    />
                    <InfoRow
                      label="Toplam hacim"
                      value={formatVolumeM3(vehicle.capacitySummary.toplamHacimM3)}
                    />
                  </dl>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Arac fotografi</h2>
              <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
                {vehicle.vehicleImageUrl ? (
                  <img
                    src={vehicle.vehicleImageUrl}
                    alt={`${vehicle.marka} ${vehicle.model} fotografi`}
                    className="h-48 w-full object-contain"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-slate-300">
                    <i className="pi pi-truck text-4xl" aria-hidden="true" />
                  </div>
                )}
              </div>
            </section>

            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">Operasyon ozeti</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {vehicleStatus.description}
                  </p>
                </div>
                <StatusPill label={vehicleStatus.label} tone={vehicleStatus.tone} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">Kapasite kullanimi</span>
                  <span className="font-black text-slate-950">{Math.round(usageRatio)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${usageRatio}%` }}
                  />
                </div>
              </div>

              <dl className="mt-4">
                <InfoRow
                  label="Aktif rezervasyon"
                  value={vehicle.capacitySummary.aktifRezervasyonSayisi}
                />
                <InfoRow
                  label="Tek tasima"
                  value={
                    vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar ? "Var" : "Yok"
                  }
                />
                <InfoRow
                  label="Hesap durumu"
                  value={vehicle.capacitySummary.hesapEksigiVar ? "Eksik" : "Tam"}
                />
              </dl>
            </section>

            <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
              <h2 className="text-sm font-black text-slate-950">Hizli aksiyonlar</h2>
              <div className="mt-3 grid gap-2">
                <Link
                  href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <span className="flex items-center gap-2">
                    <i className="pi pi-pencil text-xs text-slate-400" />
                    Araci duzenle
                  </span>
                  <i className="pi pi-angle-right text-xs text-slate-400" />
                </Link>
                <Link
                  href="/dashboard/araclarim"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <span className="flex items-center gap-2">
                    <i className="pi pi-list text-xs text-slate-400" />
                    Araclarima don
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
                    {isDeleting ? "Siliniyor..." : "Araci sil"}
                  </span>
                </button>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
