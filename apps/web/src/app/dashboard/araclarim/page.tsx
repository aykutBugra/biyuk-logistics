"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierMetricCard from "@/components/CarrierMetricCard";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import VehicleCard, { type VehicleCardModel } from "@/components/VehicleCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteVehicle,
  getMyVehicles,
  type VehicleListItem,
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

type VehicleStatusKey = "available" | "reserved" | "single-trip" | "missing-data";

function calculateVehicleUsageRatio(vehicle: VehicleListItem): number {
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

function resolveVehicleStatus(vehicle: VehicleListItem): {
  key: VehicleStatusKey;
  label: string;
  tone: VehicleCardModel["durumTonu"];
  description: string;
  usageLabel: string;
} {
  if (vehicle.capacitySummary.hesapEksigiVar) {
    return {
      key: "missing-data",
      label: "Eksik bilgi",
      tone: "amber",
      description:
        "Kapasite ozetinin bir kismi eksik kayitlarla hesaplandi. Nihai karar icin detay kaydini kontrol et.",
      usageLabel: "Oran, eksik veri nedeniyle yaklasik okunmali.",
    };
  }

  if (vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar) {
    return {
      key: "single-trip",
      label: "Tek tasima",
      tone: "rose",
      description:
        "Arac uzerinde tek tasima rezervasyonu var. Yeni tekliflerde kapasite kisiti yaratabilir.",
      usageLabel: "Tek tasima kaydi araci operasyonel olarak sinirliyor.",
    };
  }

  if (vehicle.capacitySummary.aktifRezervasyonSayisi > 0) {
    return {
      key: "reserved",
      label: "Rezerve",
      tone: "blue",
      description:
        "Aktif rezervasyonlar bu aracin kapasitesini kullaniyor. Kalan alanla teklif planlanmali.",
      usageLabel: "Rezervasyon yogunlugu bu aracta toplanmis durumda.",
    };
  }

  return {
    key: "available",
    label: "Musait",
    tone: "emerald",
    description:
      "Arac yeni eslesmeler ve teklif planlamasi icin uygun gorunuyor.",
    usageLabel: "",
  };
}

export default function MyVehiclesPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadVehicles = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyVehicles(accessToken);

        if (!isMounted) {
          return;
        }

        setVehicles(response);
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
            : "Araclar yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadVehicles();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  const handleDelete = async (vehicleId: number) => {
    if (!accessToken || deletingVehicleId !== null) {
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
      setDeletingVehicleId(vehicleId);
      await deleteVehicle(vehicleId, accessToken);
      setVehicles((currentVehicles) =>
        currentVehicles.filter((vehicle) => vehicle.id !== vehicleId)
      );
      showToast({
        severity: "success",
        summary: "Arac silindi",
        detail: "Arac filodan kaldirildi.",
      });
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
        setVehicles((currentVehicles) =>
          currentVehicles.filter((vehicle) => vehicle.id !== vehicleId)
        );
        showToast({
          severity: "warn",
          summary: "Arac bulunamadi",
          detail: "Kayit listeden kaldirildi.",
          life: 3200,
          closable: true,
        });
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
      setDeletingVehicleId(null);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const vehicleCards: VehicleCardModel[] = vehicles
    .slice()
    .sort((left, right) => right.id - left.id)
    .map((vehicle) => {
      const statusModel = resolveVehicleStatus(vehicle);
      const usageRatio = calculateVehicleUsageRatio(vehicle);
      const dimensionsLabel = formatDimensionsCm({
        uzunlukCm: vehicle.uzunlukCm,
        genislikCm: vehicle.genislikCm,
        yukseklikCm: vehicle.yukseklikCm,
      });
      const volumeCapacity =
        vehicle.capacitySummary.toplamHacimM3 ?? vehicle.maksimumHacimM3;
      const chipler: VehicleCardModel["chipler"] = [
        { label: getVehicleBodyTypeLabel(vehicle.kasaTipi) },
        { label: formatWeightKg(vehicle.maksimumAgirlikKg) },
      ];

      if (volumeCapacity !== null) {
        chipler.push({ label: formatVolumeM3(volumeCapacity) });
      }

      chipler.push({ label: `${vehicle.yil} model` });

      if (dimensionsLabel !== "Belirtilmedi") {
        chipler.push({ label: dimensionsLabel, tone: "blue" });
      }

      return {
        id: vehicle.id,
        plaka: vehicle.plaka,
        aracEtiketi: `Arac #${vehicle.id}`,
        baslik: `${vehicle.marka} ${vehicle.model}`,
        durumEtiketi: statusModel.label,
        durumTonu: statusModel.tone,
        durumAciklamasi: statusModel.description,
        chipler,
        kapasiteOzeti: [
          {
            label: "Rezerve agirlik",
            value: formatWeightKg(vehicle.capacitySummary.rezerveAgirlikKg),
          },
          {
            label: "Kalan agirlik",
            value: formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg),
          },
          {
            label: "Rezerve hacim",
            value: formatVolumeM3(vehicle.capacitySummary.rezerveHacimM3),
          },
          {
            label: "Kalan hacim",
            value: formatVolumeM3(vehicle.capacitySummary.kalanHacimM3),
          },
        ],
        operasyonOzeti: [
          {
            label: "Aktif rezervasyon",
            value: String(vehicle.capacitySummary.aktifRezervasyonSayisi),
          },
          {
            label: "Tek tasima rezerv.",
            value: vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar
              ? "Var"
              : "Yok",
          },
          {
            label: "Kalan agirlik",
            value: formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg),
          },
          {
            label: "Kalan hacim",
            value: formatVolumeM3(vehicle.capacitySummary.kalanHacimM3),
          },
        ],
        kullanimOrani: usageRatio,
        kullanimEtiketi: statusModel.usageLabel,
        imageUrl: vehicle.vehicleImageUrl,
        uyariMesaji: vehicle.capacitySummary.hesapEksigiVar
          ? "Kapasite ozeti eksik kayitlar nedeniyle yaklasik gosteriliyor."
          : null,
        detailHref: `/dashboard/araclarim/${vehicle.id}`,
        editHref: `/dashboard/araclarim/${vehicle.id}/duzenle`,
      };
    });

  const totalWeightCapacity = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.toplamAgirlikKg,
    0
  );
  const totalReservedWeight = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.rezerveAgirlikKg,
    0
  );
  const totalVolumeCapacity = vehicles.reduce(
    (total, vehicle) =>
      total + (vehicle.capacitySummary.toplamHacimM3 ?? vehicle.maksimumHacimM3 ?? 0),
    0
  );
  const totalActiveReservations = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.aktifRezervasyonSayisi,
    0
  );

  return (
    <CarrierVehiclesShell
      title="Araclarim"
      description="Filondaki araclari, kapasite durumlarini ve aktif rezervasyonlari buradan takip et."
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={
        <Link
          href="/dashboard/arac_ekle"
          className="app-pressable inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <i className="pi pi-plus text-xs" />
          Yeni arac ekle
        </Link>
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
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          >
            <CarrierMetricCard
              label="Toplam arac"
              value={vehicles.length}
              hint="Kayitli filo"
              tone="blue"
              icon={<i className="pi pi-truck text-lg" />}
            />
            <CarrierMetricCard
              label="Toplam agirlik"
              value={formatWeightKg(totalWeightCapacity)}
              hint="Tanimli yuk kapasitesi"
              tone="violet"
              icon={<i className="pi pi-box text-lg" />}
            />
            <CarrierMetricCard
              label="Rezerve agirlik"
              value={formatWeightKg(totalReservedWeight)}
              hint="Mevcut rezervasyon kullanimi"
              tone="amber"
              icon={<i className="pi pi-lock text-lg" />}
            />
            <CarrierMetricCard
              label="Toplam hacim"
              value={formatVolumeM3(totalVolumeCapacity)}
              hint="Kullanilabilir hacim kapasitesi"
              tone="emerald"
              icon={<i className="pi pi-clone text-lg" />}
            />
            <CarrierMetricCard
              label="Aktif rezervasyon"
              value={totalActiveReservations}
              hint="Takip edilen acik kayitlar"
              tone="blue"
              icon={<i className="pi pi-calendar text-lg" />}
            />
          </div>

          {vehicles.length === 0 ? (
            <div data-dashboard-primary>
              <EmptyStateCard
                title="Filonda henuz arac yok"
                description="Ilk aracini eklediginde kapasite ozetlerini ve aktif rezervasyon durumunu burada goreceksin."
                actionHref="/dashboard/arac_ekle"
                actionLabel="Ilk araci ekle"
              />
            </div>
          ) : (
            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                      Filo kayitlari
                    </h2>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {vehicleCards.length}
                    </span>
                  </div>

                  {totalActiveReservations > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {totalActiveReservations} aktif rezervasyon
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  Tum araclarini kapasite kullanimi ve rezervasyon sinyalleriyle birlikte tek listede oku.
                </p>
              </div>

              <div className="p-4 md:p-5">
                <div className="grid gap-4">
                  {vehicleCards.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      isDeleting={deletingVehicleId === vehicle.id}
                      onDelete={() => void handleDelete(vehicle.id)}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
