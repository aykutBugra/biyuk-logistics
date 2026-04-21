"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="font-medium text-gray-600">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell title="Arac detayi">
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Arac detayi yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Kayit goruntulenemedi</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicle ? (
        <div className="grid gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    {vehicle.plaka}
                  </span>
                  <span>#{vehicle.id}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {vehicle.marka} {"->"} {vehicle.model}
                </h2>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="text-sm text-gray-500">{vehicle.yil} model</div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Araci Duzenle
                  </Link>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? "Siliniyor..." : "Araci Sil"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Arac bilgileri</h3>
            <dl className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Marka</dt>
                <dd>{vehicle.marka}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Model</dt>
                <dd>{vehicle.model}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Plaka</dt>
                <dd>{vehicle.plaka}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Yil</dt>
                <dd>{vehicle.yil}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Kasa tipi</dt>
                <dd>{getVehicleBodyTypeLabel(vehicle.kasaTipi)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Maksimum agirlik</dt>
                <dd>{formatWeightKg(vehicle.maksimumAgirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Maksimum hacim</dt>
                <dd>{formatVolumeM3(vehicle.maksimumHacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Yukleme alani</dt>
                <dd>{formatDimensionsCm(vehicle)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
