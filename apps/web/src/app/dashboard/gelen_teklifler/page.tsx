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
import { useConfirm } from "@/lib/confirm/confirm-context";
import { useToast } from "@/lib/toast/toast-context";

export default function MyIncomingOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
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

    const isConfirmed = await confirm({
      title:
        action === "accept" ? "Teklifi kabul et" : "Teklifi reddet",
      message: confirmMessage,
      tone: action === "reject" ? "danger" : "default",
      confirmLabel: action === "accept" ? "Kabul Et" : "Reddet",
      cancelLabel: "Vazgec",
      defaultFocus: action === "reject" ? "reject" : "accept",
      dismissableMask: action !== "reject",
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setActingOfferId(offer.id);

      if (action === "accept") {
        await acceptOffer(offer.id, accessToken);
        showToast({
          severity: "success",
          summary: "Teklif kabul edildi",
          detail: "Nakliye kaydi olusturuldu.",
        });
      } else {
        await rejectOffer(offer.id, accessToken);
        showToast({
          severity: "info",
          summary: "Teklif reddedildi",
          detail: "Teklif durumu guncellendi.",
        });
      }

      setReloadKey((currentKey) => currentKey + 1);
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
        showToast({
          severity: "warn",
          summary: "Teklif bulunamadi",
          detail: "Liste guncellenecek.",
          life: 3200,
          closable: true,
        });
        setReloadKey((currentKey) => currentKey + 1);
        return;
      }

      showToast({
        severity: "error",
        summary: "Teklif guncellenemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Teklif karari verilirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
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
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={<InlineHelpTrigger helpKey="incoming-offers" />}
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

      {!isLoading && !errorMessage && offers.length === 0 ? (
        <div data-dashboard-primary>
          <EmptyStateCard
            title="Bekleyen teklif yok"
            description="Nakliyecilerden teklif geldiginde burada goreceksin. Teklif almak icin once tasima istegi olusturmani gerekiyor."
            actionHref="/dashboard/isteklerim"
            actionLabel="Isteklerime git"
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4">
          {pendingCount > 0 ? (
            <div data-dashboard-stats>
              <p className="text-sm font-medium text-slate-500">
                {pendingCount} teklif karar bekleniyor.
              </p>
            </div>
          ) : null}

          <div data-dashboard-primary className="grid gap-4">
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
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
