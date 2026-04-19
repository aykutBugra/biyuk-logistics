"use client";

import { useEffect, useState } from "react";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyOffers, type OfferItem } from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { useRouter } from "next/navigation";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MyOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [offers, setOffers] = useState<OfferItem[]>([]);
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

    const loadOffers = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyOffers(accessToken);

        if (!isMounted) {
          return;
        }

        setOffers(response);
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
            : "Teklifler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadOffers();

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
      title="Tekliflerim"
      description="Verdigin teklifleri ve bagli olduklari tasima taleplerini takip et."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Teklifler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Henuz teklif yok</h2>
          <p className="mt-2 text-sm text-gray-600">
            Acik istekler ekranindan ilk teklifini olusturunca burada goreceksin.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      {offer.durum}
                    </span>
                    <span>Teklif #{offer.id}</span>
                    <span>Istek #{offer.requestId}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {offer.baslangicSehri} {"->"} {offer.varisSehri}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {offer.aracPlaka
                      ? `Secilen arac: ${offer.aracPlaka}`
                      : "Arac bilgisi bulunamadi."}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(offer.fiyat)}
                  </p>
                  {offer.not ? (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{offer.not}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Teklif notu eklenmedi.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
