"use client";

import IncomingOffersWorkspace from "@/features/customer-workspace/IncomingOffersWorkspace";
import { PageHeader } from "@/components/ui";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";


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

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}


function getStatusPriority(status: string): number {
  switch (normalizeStatus(status)) {
    case "OLUSTURULDU":
      return 0;
    case "KABUL_EDILDI":
      return 1;
    case "REDDEDILDI":
      return 2;
    case "IPTAL_EDILDI":
      return 3;
    default:
      return 4;
  }
}

// Musteri gelen teklifleri listeler, kabul/red kararini ve konusmaya gecisi buradan yapar.
export default function MyIncomingOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const [offers, setOffers] = useState<MyIncomingOfferItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Musteri guard hazir olmadan gelen teklifler endpoint'i cagrilmaz.
    if (status !== "ready" || !accessToken) {
      return;
    }

    let isMounted = true;

    const loadOffers = async () => {
      try {
        // Teklifler backend'den geldikten sonra ekranda durum onceligine gore siralanir.
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

  // Kabul veya red aksiyonu ayni handler icinde, action parametresiyle ayrilir.
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
      title: action === "accept" ? "Teklifi kabul et" : "Teklifi reddet",
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
      // Token/rol hatasinda kullanici stale teklif ekraninda birakilmaz.
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

  const pendingOffers = offers.filter((offer) => normalizeStatus(offer.durum) === "OLUSTURULDU");



  const featuredPendingOffer =
    [...pendingOffers].sort(
      (left, right) => left.fiyat - right.fiyat || left.id.localeCompare(right.id)
    )[0] ??
    null;
  const featuredOfferId = featuredPendingOffer?.id ?? null;
  const sortedOffers = [...offers].sort((left, right) => {
    if (left.id === featuredOfferId && right.id !== featuredOfferId) {
      return -1;
    }

    if (right.id === featuredOfferId && left.id !== featuredOfferId) {
      return 1;
    }

    const priorityDifference =
      getStatusPriority(left.durum) - getStatusPriority(right.durum);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (normalizeStatus(left.durum) === "OLUSTURULDU" && left.fiyat !== right.fiyat) {
      return left.fiyat - right.fiyat;
    }

    return right.id.localeCompare(left.id);
  });

  return (
    <CustomerTransportRequestsShell
      title="Gelen teklifler"
      pageHeader={<PageHeader title="Gelen teklifler" description="Nakliyecilerin tekliflerini ve taşıma koşullarını değerlendirin." actions={<InlineHelpTrigger helpKey="incoming-offers" />} />}
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
    >
      <IncomingOffersWorkspace offers={sortedOffers} isLoading={isLoading} errorMessage={errorMessage} actingOfferId={actingOfferId}
        onDecision={(offer, action) => void handleOfferDecision(offer, action)} />
    </CustomerTransportRequestsShell>
  );
}
