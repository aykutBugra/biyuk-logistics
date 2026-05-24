"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import DashboardActionCard from "@/components/DashboardActionCard";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MyRequestCard from "@/components/MyRequestCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyIncomingOffers, type MyIncomingOfferItem } from "@/lib/api/offers";
import {
  deleteTransportRequest,
  getMyTransportRequests,
  type TransportRequestListItem,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import { useToast } from "@/lib/toast/toast-context";

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

// Gelen teklifler requestId bazinda sayilarak istek kartlarina rozet olarak eklenir.
function buildOfferCountMap(offers: MyIncomingOfferItem[]): Map<string, number> {
  return offers.reduce((map, offer) => {
    const currentCount = map.get(offer.requestId) ?? 0;
    map.set(offer.requestId, currentCount + 1);
    return map;
  }, new Map<string, number>());
}

// Bekleyen teklif olan kac farkli istek var dashboard metrigi icin hesaplanir.
function buildPendingOfferRequestCount(offers: MyIncomingOfferItem[]): number {
  const requestIds = new Set(
    offers
      .filter((offer) => normalizeStatus(offer.durum) === "OLUSTURULDU")
      .map((offer) => offer.requestId)
  );

  return requestIds.size;
}

// Musterinin kendi tasima taleplerini ve gelen teklif ozetlerini listeler.
export default function MyTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const [requests, setRequests] = useState<TransportRequestListItem[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<MyIncomingOfferItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  useEffect(() => {
    // Musteri guard hazir olmadan istek ve teklif listesi cagrilmaz.
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRequests = async () => {
      try {
        // Talepler ve gelen teklifler ayni ekranda birlestirilecegi icin paralel cekilir.
        setIsLoading(true);
        setErrorMessage(null);

        const [requestsResult, offersResult] = await Promise.allSettled([
          getMyTransportRequests(accessToken),
          getMyIncomingOffers(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        if (requestsResult.status === "rejected") {
          throw requestsResult.reason;
        }

        setRequests(requestsResult.value);

        if (offersResult.status === "fulfilled") {
          setIncomingOffers(offersResult.value);
          return;
        }

        if (
          offersResult.reason instanceof ApiClientError &&
          offersResult.reason.status === 401
        ) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (
          offersResult.reason instanceof ApiClientError &&
          offersResult.reason.status === 403
        ) {
          router.replace("/");
          return;
        }

        setIncomingOffers([]);
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
            : "Istekler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  // Talep silme onaydan sonra backend durum/sahiplik kontrolunden gecerek yapilir.
  const handleDelete = async (requestId: string) => {
    if (!accessToken || deletingRequestId === requestId) {
      return;
    }

    const isConfirmed = await confirm({
      title: "Tasima istegini sil",
      message: "Bu tasima istegini silmek istedigine emin misin?",
      tone: "danger",
      confirmLabel: "Sil",
      cancelLabel: "Vazgec",
      defaultFocus: "reject",
      dismissableMask: false,
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingRequestId(requestId);
      await deleteTransportRequest(requestId, accessToken);
      setRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId)
      );
      setIncomingOffers((currentOffers) =>
        currentOffers.filter((offer) => offer.requestId !== requestId)
      );
      showToast({
        severity: "success",
        summary: "Istek silindi",
        detail: "Tasima istegi listeden kaldirildi.",
      });
    } catch (error) {
      // Auth/rol hatasinda musteri tekrar uygun sayfaya yonlendirilir.
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
        setRequests((currentRequests) =>
          currentRequests.filter((request) => request.id !== requestId)
        );
        setIncomingOffers((currentOffers) =>
          currentOffers.filter((offer) => offer.requestId !== requestId)
        );
        showToast({
          severity: "warn",
          summary: "Istek bulunamadi",
          detail: "Kayit listeden kaldirildi.",
          life: 3200,
          closable: true,
        });
        return;
      }

      if (error instanceof ApiClientError) {
        showToast({
          severity: "error",
          summary: "Istek silinemedi",
          detail: error.message,
          life: 3600,
          closable: true,
        });
        return;
      }

      showToast({
        severity: "error",
        summary: "Istek silinemedi",
        detail: "Istek silinirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
    } finally {
      setDeletingRequestId((currentRequestId) =>
        currentRequestId === requestId ? null : currentRequestId
      );
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const offerCountMap = buildOfferCountMap(incomingOffers);
  const sortedRequests = [...requests].sort(
    (left, right) =>
      new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime()
  );
  const totalRequestCount = requests.length;
  const openFlowCount = requests.filter(
    (request) => normalizeStatus(request.durum) === "OLUSTURULDU"
  ).length;
  const agreementCount = requests.filter((request) => {
    const normalizedStatus = normalizeStatus(request.durum);
    return normalizedStatus === "ANLASILDI" || normalizedStatus === "TAMAMLANDI";
  }).length;
  const pendingOfferRequestCount = buildPendingOfferRequestCount(incomingOffers);

  return (
    <CustomerTransportRequestsShell
      title="Isteklerim"
      description="Olusturdugunuz tasima taleplerini ve aktif akislarini buradan takip edebilirsiniz."
      pageEyebrow="Calisma alani"
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={
        <div className="flex items-center gap-3">
          <InlineHelpTrigger helpKey="my-requests" />
          <Link
            href="/dashboard/istek_ekle"
            className="app-button-primary app-pressable inline-flex items-center gap-2"
          >
            <i className="pi pi-plus text-xs" />
            Yeni istek
          </Link>
        </div>
      }
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
            label="Toplam istek"
            value={totalRequestCount}
            hint="Bugune kadar olusturdugun tum talepler"
            tone="blue"
            icon={<i className="pi pi-file text-lg" />}
          />
          <CustomerMetricCard
            label="Acik akista"
            value={openFlowCount}
            hint="Teklif bekleyen aktif talepler"
            tone="emerald"
            icon={<i className="pi pi-refresh text-lg" />}
          />
          <CustomerMetricCard
            label="Anlasilan is"
            value={agreementCount}
            hint="Sonuca ulasan tasima talepleri"
            tone="amber"
            icon={<i className="pi pi-check-circle text-lg" />}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CustomerSectionSurface
            title="Tum istekler"
            count={totalRequestCount}
            description="Taleplerini fotoğraf, durum ve teklif akisiyla birlikte tek listede izle."
            action={
              totalRequestCount > 0 ? (
                <Link href="/dashboard/gelen_teklifler" className="app-button-secondary">
                  Gelen teklifleri gor
                </Link>
              ) : null
            }
            contentClassName={totalRequestCount > 0 ? "p-0" : "p-5 md:p-6"}
          >
            {totalRequestCount === 0 ? (
              <EmptyStateCard
                title="Henuz istek yok"
                description="Ilk istegini olusturdugunda burada durumunu, gelen teklifleri ve sonraki adimlari daha guclu bir ozetle goreceksin."
                actionHref="/dashboard/istek_ekle"
                actionLabel="Ilk istegi olustur"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {sortedRequests.map((request) => (
                  <div key={request.id} className="p-4 md:p-5">
                    <MyRequestCard
                      request={request}
                      offerCount={offerCountMap.get(request.id) ?? 0}
                      isDeleting={deletingRequestId === request.id}
                      onDelete={() => void handleDelete(request.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CustomerSectionSurface>

          <div className="space-y-4">
            <CustomerSectionSurface
              title="Hizli islemler"
              description="Mevcut musteri akislarini kisa yoldan ac."
              contentClassName="p-4 md:p-5"
            >
              <div className="grid gap-3">
                <DashboardActionCard
                  href="/dashboard/istek_ekle"
                  title="Yeni tasima talebi olustur"
                  variant="quiet"
                />
                <DashboardActionCard
                  href="/dashboard/gelen_teklifler"
                  title="Teklif bekleyen talepler"
                  meta={pendingOfferRequestCount > 0 ? String(pendingOfferRequestCount) : undefined}
                  variant="quiet"
                />
                <DashboardActionCard
                  href="/dashboard/konusmalar"
                  title="Konusmalari ac"
                  variant="quiet"
                />
              </div>
            </CustomerSectionSurface>
          </div>
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
