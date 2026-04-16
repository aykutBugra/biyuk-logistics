"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyVehicles, type VehicleListItem } from "@/lib/api/vehicles";
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

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Araclarim"
      description="Yalnizca giris yapan nakliyeciye ait arac kayitlari listelenir."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Araclar yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicles.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Henuz arac yok</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ilk arac kaydini olusturunca burada goreceksin.
          </p>
          <Link
            href="/dashboard/arac_ekle"
            className="mt-4 inline-flex items-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Ilk araci ekle
          </Link>
        </div>
      ) : null}

      {!isLoading && !errorMessage && vehicles.length > 0 ? (
        <div className="grid gap-4">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/dashboard/araclarim/${vehicle.id}`}
              className="block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-blue-200"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      {vehicle.plaka}
                    </span>
                    <span>#{vehicle.id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {vehicle.marka} {"->"} {vehicle.model}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {vehicle.yil} model · {formatCapacity(vehicle.kapasite)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
