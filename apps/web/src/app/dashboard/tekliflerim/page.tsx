"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MyOfferCard from "@/components/MyOfferCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyOffers, type OfferItem } from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

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
        <p className="font-medium text-slate-500">Yukleniyor...</p>
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
      description="Verdigin teklifleri, her birinin mevcut durumunu ve musteri yanitlarini buradan takip et."
      headerActions={<InlineHelpTrigger helpKey="my-offers" />}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryStatCard label="Toplam teklif" value={offers.length} />
          <SummaryStatCard label="Beklemede" value={openOfferCount} />
          <SummaryStatCard label="Kabul edilen" value={acceptedOfferCount} />
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length === 0 ? (
        <EmptyStateCard
          title="Henuz teklif yok"
          description="Acik istekleri inceleyip ilk teklifini verdiginde burada goreceksin."
          actionHref="/dashboard/acik_istekler"
          actionLabel="Acik istekleri incele"
        />
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <MyOfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
