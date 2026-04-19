"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyOffers, type OfferItem } from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  const openOfferCount = offers.filter(
    (offer) => offer.durum.trim().toUpperCase() === "OLUSTURULDU"
  ).length;
  const acceptedOfferCount = offers.filter(
    (offer) => offer.durum.trim().toUpperCase() === "KABUL_EDILDI"
  ).length;

  return (
    <CarrierVehiclesShell
      title="Tekliflerim"
      description="Verdigin teklifleri ve bagli olduklari tasima taleplerini takip et."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Teklifler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStatCard
            label="Toplam teklif"
            value={offers.length}
            hint="Nakliyeci hesabindan olusturulan teklifler."
          />
          <SummaryStatCard
            label="Acik teklif"
            value={openOfferCount}
            hint="Henuz karar verilmemis teklifler."
          />
          <SummaryStatCard
            label="Kabul edilen"
            value={acceptedOfferCount}
            hint="Anlasilan is akisina donusen teklifler."
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length === 0 ? (
        <EmptyStateCard
          eyebrow="Teklif akisi"
          title="Henuz teklif yok"
          description="Acik istekler ekranindan ilk teklifini olusturdugunda yonetim listesi burada gorunecek."
          actionHref="/dashboard/acik_istekler"
          actionLabel="Acik istekleri incele"
        />
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <StatusBadge status={offer.durum} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Teklif #{offer.id}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Istek #{offer.requestId}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {offer.baslangicSehri} {"->"} {offer.varisSehri}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {offer.aracPlaka
                        ? `Secilen arac: ${offer.aracPlaka}`
                        : "Arac bilgisi bulunamadi."}
                    </p>
                    <p className="max-w-3xl text-sm leading-6 text-slate-500 line-clamp-3">
                      {offer.not ?? "Teklif notu eklenmedi."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:min-w-[200px] lg:items-end">
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {formatCurrency(offer.fiyat)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Fiyat ve durum bu listede birincil tarama alanlari olarak
                    one cikarildi.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
