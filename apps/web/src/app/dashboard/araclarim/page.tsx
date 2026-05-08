"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import VehicleCard from "@/components/VehicleCard";
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
  formatVolumeM3,
  formatWeightKg,
} from "@/lib/logistics";
import { useToast } from "@/lib/toast/toast-context";

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

  const totalWeightCapacity = vehicles.reduce(
    (total, vehicle) => total + vehicle.maksimumAgirlikKg,
    0
  );
  const totalReservedWeight = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.rezerveAgirlikKg,
    0
  );
  const totalVolumeCapacity = vehicles.reduce(
    (total, vehicle) => total + (vehicle.maksimumHacimM3 ?? 0),
    0
  );
  const totalReservedVolume = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.rezerveHacimM3,
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

      {!isLoading && !errorMessage && vehicles.length > 0 ? (
        <div data-dashboard-stats className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryStatCard label="Toplam arac" value={vehicles.length} density="tight" />
          <SummaryStatCard
            label="Toplam agirlik"
            value={formatWeightKg(totalWeightCapacity)}
            density="tight"
          />
          <SummaryStatCard
            label="Rezerve agirlik"
            value={formatWeightKg(totalReservedWeight)}
            density="tight"
          />
          <SummaryStatCard
            label="Toplam hacim"
            value={formatVolumeM3(totalVolumeCapacity)}
            density="tight"
          />
          <SummaryStatCard
            label="Aktif rezervasyon"
            value={totalActiveReservations}
            hint={`Rezerve hacim: ${formatVolumeM3(totalReservedVolume)}`}
            density="tight"
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicles.length === 0 ? (
        <div data-dashboard-primary>
          <EmptyStateCard
            title="Filonda arac yok"
            description="Ilk aracini ekleyerek teklif vermeye baslayabilirsin. Arac olmadan musteri isteklerine teklif yapamaz veya istegin karsiliksiz kalir."
            actionHref="/dashboard/arac_ekle"
            actionLabel="Ilk araci ekle"
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicles.length > 0 ? (
        <div data-dashboard-primary className="grid gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isDeleting={deletingVehicleId === vehicle.id}
              onDelete={() => void handleDelete(vehicle.id)}
            />
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
