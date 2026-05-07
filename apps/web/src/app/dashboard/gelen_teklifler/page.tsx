"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import IncomingOfferCard from "@/components/IncomingOfferCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { ApiClientError } from "@/lib/api/api-client";
import {
  acceptOffer,
  getMyIncomingOffers,
  rejectOffer,
  type MyIncomingOfferItem,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";

export default function MyIncomingOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [offers, setOffers] = useState<MyIncomingOfferItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOfferId, setActingOfferId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
        const response = await getMyIncomingOffers(accessToken);

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
            : "Gelen teklifler yuklenirken beklenmeyen bir hata olustu."
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
  }, [accessToken, reloadKey, router, status]);

  const handleOfferDecision = async (
    offer: MyIncomingOfferItem,
    action: "accept" | "reject"
  ) => {
    if (!accessToken || actingOfferId !== null) {
      return;
    }

    const confirmMessage =
      action === "accept"
        ? "Bu teklifi kabul etmek istedigine emin misin?"
        : "Bu teklifi reddetmek istedigine emin misin?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActingOfferId(offer.id);

      if (action === "accept") {
        await acceptOffer(offer.id, accessToken);
        window.alert("Teklif kabul edildi ve nakliye olusturuldu.");
      } else {
        await rejectOffer(offer.id, accessToken);
        window.alert("Teklif reddedildi.");
      }

      setReloadKey((currentKey) => currentKey + 1);
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
        window.alert("Bu teklif artik bulunamiyor.");
        setReloadKey((currentKey) => currentKey + 1);
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Teklif karari verilirken beklenmeyen bir hata olustu."
      );
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setActingOfferId(null);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const pendingCount = offers.filter(
    (o) => o.durum.trim().toUpperCase() === "OLUSTURULDU"
  ).length;

  return (
    <CustomerTransportRequestsShell
      title="Gelen Teklifler"
      description="Nakliyecilerden gelen teklifleri incele ve karar ver."
      headerActions={<InlineHelpTrigger helpKey="incoming-offers" />}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length === 0 ? (
        <EmptyStateCard
          title="Bekleyen teklif yok"
          description="Nakliyecilerden teklif geldiginde burada goreceksin. Teklif almak icin once tasima istegi olusturmani gerekiyor."
          actionHref="/dashboard/isteklerim"
          actionLabel="Isteklerime git"
        />
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4">
          {pendingCount > 0 ? (
            <p className="text-sm font-medium text-slate-500">
              {pendingCount} teklif karar bekleniyor.
            </p>
          ) : null}

          {offers.map((offer) => (
            <IncomingOfferCard
              key={offer.id}
              offer={offer}
              isProcessingThis={actingOfferId === offer.id}
              isAnyProcessing={actingOfferId !== null}
              onAccept={(o) => void handleOfferDecision(o, "accept")}
              onReject={(o) => void handleOfferDecision(o, "reject")}
            />
          ))}
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
