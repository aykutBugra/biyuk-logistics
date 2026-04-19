"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteVehicle,
  getMyVehicles,
  type VehicleListItem,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

function formatCapacity(value: number): string {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value)} ton`;
}

export default function MyVehiclesPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
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

    const isConfirmed = window.confirm(
      "Bu araci silmek istedigine emin misin?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingVehicleId(vehicleId);
      await deleteVehicle(vehicleId, accessToken);
      setVehicles((currentVehicles) =>
        currentVehicles.filter((vehicle) => vehicle.id !== vehicleId)
      );
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.alert("Oturum gecersiz. Lutfen yeniden giris yapin.");
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        window.alert("Bu islem icin yetkin yok.");
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        setVehicles((currentVehicles) =>
          currentVehicles.filter((vehicle) => vehicle.id !== vehicleId)
        );
        window.alert("Bu arac artik bulunamiyor.");
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Arac silinirken beklenmeyen bir hata olustu."
      );
    } finally {
      setDeletingVehicleId(null);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  const totalCapacity = vehicles.reduce(
    (total, vehicle) => total + vehicle.kapasite,
    0
  );
  const newestModelYear = vehicles.reduce(
    (latestYear, vehicle) => Math.max(latestYear, vehicle.yil),
    0
  );

  return (
    <CarrierVehiclesShell
      title="Araclarim"
      description="Yalnizca giris yapan nakliyeciye ait aktif arac kayitlari listelenir."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Araclar yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStatCard
            label="Toplam arac"
            value={vehicles.length}
            hint="Aktif kayit durumundaki araclar."
          />
          <SummaryStatCard
            label="Toplam kapasite"
            value={formatCapacity(totalCapacity)}
            hint="Arac varliginin tasima kapasitesi toplami."
          />
          <SummaryStatCard
            label="En yeni model"
            value={newestModelYear}
            hint="Listede yer alan en guncel model yili."
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicles.length === 0 ? (
        <EmptyStateCard
          eyebrow="Arac varligi"
          title="Henuz arac yok"
          description="Ilk arac kaydini olusturdugunda yonetim listesi burada gorunecek."
          actionHref="/dashboard/arac_ekle"
          actionLabel="Ilk araci ekle"
        />
      ) : null}

      {!isLoading && !errorMessage && vehicles.length > 0 ? (
        <div className="grid gap-4">
          {vehicles.map((vehicle) => {
            const isDeleting = deletingVehicleId === vehicle.id;

            return (
              <div
                key={vehicle.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                        {vehicle.plaka}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Arac #{vehicle.id}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">
                        {vehicle.marka} {"->"} {vehicle.model}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {vehicle.yil} model | {formatCapacity(vehicle.kapasite)}
                      </p>
                      <p className="text-sm leading-6 text-slate-500">
                        Arac listesi yonetim odaklidir; plaka birincil kimlik,
                        marka-model ise ikinci seviye ozet alanidir.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:min-w-[240px] lg:items-end">
                    <p className="text-sm text-slate-500">
                      Detay, duzenleme ve silme aksiyonlari bu karttan devam eder.
                    </p>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Link
                        href={`/dashboard/araclarim/${vehicle.id}`}
                        className="inline-flex items-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Detay
                      </Link>
                      <Link
                        href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
                        className="inline-flex items-center rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        Duzenle
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(vehicle.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? "Siliniyor..." : "Sil"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
