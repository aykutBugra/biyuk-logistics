"use client";

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
import {
  formatDimensionsCm,
  formatVolumeM3,
  formatWeightKg,
  getVehicleBodyTypeLabel,
} from "@/lib/logistics";

export default function VehicleDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
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

    if (!window.confirm("Bu araci silmek istedigine emin misin?")) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteVehicle(vehicle.id, accessToken);
      router.replace("/dashboard/araclarim");
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
        window.alert("Bu arac bulunamadi.");
        router.replace("/dashboard/araclarim");
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Arac silinirken beklenmeyen bir hata olustu."
      );
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
    <CarrierVehiclesShell title="Arac detayi">
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          <h2 className="text-base font-bold text-red-800">Kayit goruntulenemedi</h2>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicle ? (
        <div className="grid gap-6">
          {/* Identity header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    {vehicle.plaka}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    #{vehicle.id}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {vehicle.marka} {vehicle.model}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {getVehicleBodyTypeLabel(vehicle.kasaTipi)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {vehicle.yil} model
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Araci Duzenle
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="text-sm font-semibold text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Siliniyor..." : "Araci Sil"}
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle specs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Arac bilgileri</h3>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Marka</dt>
                <dd>{vehicle.marka}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Model</dt>
                <dd>{vehicle.model}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Plaka</dt>
                <dd>{vehicle.plaka}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Yil</dt>
                <dd>{vehicle.yil}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Kasa tipi</dt>
                <dd>{getVehicleBodyTypeLabel(vehicle.kasaTipi)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Maksimum agirlik</dt>
                <dd>{formatWeightKg(vehicle.maksimumAgirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Maksimum hacim</dt>
                <dd>{formatVolumeM3(vehicle.maksimumHacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Yukleme alani</dt>
                <dd>{formatDimensionsCm(vehicle)}</dd>
              </div>
            </dl>
          </div>

          {/* Capacity summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Kapasite ozeti</h3>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Toplam agirlik</dt>
                <dd>{formatWeightKg(vehicle.capacitySummary.toplamAgirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Rezerve agirlik</dt>
                <dd>{formatWeightKg(vehicle.capacitySummary.rezerveAgirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Kalan agirlik</dt>
                <dd>{formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Toplam hacim</dt>
                <dd>{formatVolumeM3(vehicle.capacitySummary.toplamHacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Rezerve hacim</dt>
                <dd>{formatVolumeM3(vehicle.capacitySummary.rezerveHacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Kalan hacim</dt>
                <dd>{formatVolumeM3(vehicle.capacitySummary.kalanHacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Aktif rezervasyon</dt>
                <dd>{vehicle.capacitySummary.aktifRezervasyonSayisi}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">
                  Aktif tek tasima rezervasyonu
                </dt>
                <dd>
                  {vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar
                    ? "Var"
                    : "Yok"}
                </dd>
              </div>
            </dl>

            {vehicle.capacitySummary.hesapEksigiVar ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Kapasite ozeti eksik kayitlar nedeniyle kesin yorum degildir.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
