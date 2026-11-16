"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { LinkButton, PageHeader, UiScope } from "@/components/ui";
import RequestsWorkspace from "@/features/transport-requests/components/RequestsWorkspace";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyIncomingOffers, type MyIncomingOfferItem } from "@/lib/api/offers";
import { deleteTransportRequest, getMyTransportRequests, type TransportRequestListItem } from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import { useToast } from "@/lib/toast/toast-context";

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

  return (
    <UiScope>
      <CustomerTransportRequestsShell
        title="İsteklerim"
        motionPreset="operational"
        cardMotionLimit={6}
        pageHeader={
          <PageHeader
            eyebrow="Müşteri çalışma alanı"
            title="İsteklerim"
            description="Taşıma taleplerinizi yönetin, gelen teklifleri ve taşımanızın durumunu takip edin."
            actions={
              <>
                <InlineHelpTrigger helpKey="my-requests" />
                <LinkButton href="/dashboard/istek_ekle" variant="primary">
                  <i className="pi pi-plus" aria-hidden="true" /> Yeni istek
                </LinkButton>
              </>
            }
          />
        }
      >
        <RequestsWorkspace
          requests={requests}
          incomingOffers={incomingOffers}
          isLoading={isLoading}
          errorMessage={errorMessage}
          deletingRequestId={deletingRequestId}
          onDelete={(requestId) => void handleDelete(requestId)}
        />
      </CustomerTransportRequestsShell>
    </UiScope>
  );
}
