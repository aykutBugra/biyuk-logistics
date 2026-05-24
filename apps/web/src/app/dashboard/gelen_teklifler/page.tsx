"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
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

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
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
      if (status === "checking") {
        setIsLoading(true);
      }
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
  const acceptedOffers = offers.filter(
    (offer) => normalizeStatus(offer.durum) === "KABUL_EDILDI"
  );
  const rejectedOffers = offers.filter(
    (offer) => normalizeStatus(offer.durum) === "REDDEDILDI"
  );
  const bestPrice = offers.reduce(
    (currentMin, offer) => Math.min(currentMin, offer.fiyat),
    offers.length > 0 ? offers[0].fiyat : 0
  );
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
      title="Gelen Teklifler"
      description="Nakliyecilerden gelen teklifleri inceleyin, karsilastirin ve en uygun karari verin."
      pageEyebrow="Calisma alani"
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

      {!isLoading && !errorMessage ? (
        <div data-dashboard-stats className="grid gap-3 md:grid-cols-3">
          <CustomerMetricCard
            label="Karar Bekleyen"
            value={pendingOffers.length}
            hint="Teklifinizin yanitini bekleyen kayitlar"
            tone="amber"
            icon={<i className="pi pi-clock text-lg" />}
          />
          <CustomerMetricCard
            label="Toplam Teklif"
            value={offers.length}
            hint="Tum talepleriniz icin gelen teklifler"
            tone="emerald"
            icon={<i className="pi pi-wallet text-lg" />}
          />
          <CustomerMetricCard
            label="En Iyi Fiyat"
            value={formatCurrency(bestPrice)}
            hint="En dusuk gelen teklif"
            tone="violet"
            icon={<i className="pi pi-tag text-lg" />}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="mt-4">
          <CustomerSectionSurface
            title="Tum teklifler"
            count={offers.length}
            description="Mevcut teklifleri talep baglami, tasima ozeti ve karar aksiyonlariyla birlikte goruntuleyin."
            action={
              offers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <CustomerWorkspaceSignalPill
                    tone="amber"
                    label={`${pendingOffers.length} bekleyen`}
                  />
                  <CustomerWorkspaceSignalPill
                    tone="emerald"
                    label={`${acceptedOffers.length} cevaplanan`}
                  />
                  <CustomerWorkspaceSignalPill
                    tone="slate"
                    label={`${rejectedOffers.length} reddedilen`}
                  />
                </div>
              ) : (
                <Link href="/dashboard/isteklerim" className="app-button-secondary">
                  Isteklerime git
                </Link>
              )
            }
            contentClassName={offers.length > 0 ? "p-4 md:p-5" : "p-4 md:p-5"}
          >
            {offers.length === 0 ? (
              <EmptyStateCard
                title="Bekleyen teklif yok"
                description="Nakliyecilerden teklif geldiginde burada goruntuleyeceksin. Teklif almak icin once tasima istegi olusturman gerekiyor."
                actionHref="/dashboard/isteklerim"
                actionLabel="Isteklerime git"
              />
            ) : (
              <div className="grid gap-4">
                {sortedOffers.map((offer) => (
                  <IncomingOfferCard
                    key={offer.id}
                    offer={offer}
                    isFeatured={offer.id === featuredOfferId}
                    isProcessingThis={actingOfferId === offer.id}
                    isAnyProcessing={actingOfferId !== null}
                    onAccept={(currentOffer) => void handleOfferDecision(currentOffer, "accept")}
                    onReject={(currentOffer) => void handleOfferDecision(currentOffer, "reject")}
                  />
                ))}
              </div>
            )}
          </CustomerSectionSurface>
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
