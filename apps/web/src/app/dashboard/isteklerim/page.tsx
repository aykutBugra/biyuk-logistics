"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MyRequestCard from "@/components/MyRequestCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteTransportRequest,
  getMyTransportRequests,
  type TransportRequestListItem,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import { useToast } from "@/lib/toast/toast-context";

export default function MyTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const [requests, setRequests] = useState<TransportRequestListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRequests = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyTransportRequests(accessToken);

        if (!isMounted) {
          return;
        }

        setRequests(response);
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

  const handleDelete = async (requestId: number) => {
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
      showToast({
        severity: "success",
        summary: "Istek silindi",
        detail: "Tasima istegi listeden kaldirildi.",
      });
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
        setRequests((currentRequests) =>
          currentRequests.filter((request) => request.id !== requestId)
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

  const agreementCount = requests.filter((request) => {
    const normalizedStatus = request.durum.trim().toUpperCase();
    return normalizedStatus === "ANLASILDI" || normalizedStatus === "TAMAMLANDI";
  }).length;
  const activeCount = requests.length - agreementCount;

  return (
    <CustomerTransportRequestsShell
      title="Isteklerim"
      description="Olusturdugun tasima taleplerini ve her birinin aktif akis durumunu buradan takip et."
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={
        <div className="flex items-center gap-3">
          <InlineHelpTrigger helpKey="my-requests" />
          <Link
            href="/dashboard/istek_ekle"
            className="app-pressable inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
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

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div data-dashboard-stats className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryStatCard label="Toplam istek" value={requests.length} density="compact" />
          <SummaryStatCard label="Acik akista" value={activeCount} density="compact" />
          <SummaryStatCard label="Anlasilan is" value={agreementCount} density="compact" />
        </div>
      ) : null}

      {!isLoading && !errorMessage && requests.length === 0 ? (
        <div data-dashboard-primary>
          <EmptyStateCard
            title="Henuz istek yok"
            description="Ilk istegini olusturdugunda burada goreceksin."
            actionHref="/dashboard/istek_ekle"
            actionLabel="Ilk istegi olustur"
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div data-dashboard-primary className="grid gap-4">
          {requests.map((request) => (
            <MyRequestCard
              key={request.id}
              request={request}
              isDeleting={deletingRequestId === request.id}
              onDelete={() => void handleDelete(request.id)}
            />
          ))}
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
