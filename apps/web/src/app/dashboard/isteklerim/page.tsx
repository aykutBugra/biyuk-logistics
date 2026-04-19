"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteTransportRequest,
  getMyTransportRequests,
  type TransportRequestListItem,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MyTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
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

    const isConfirmed = window.confirm(
      "Bu tasima istegini silmek istedigine emin misin?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingRequestId(requestId);
      await deleteTransportRequest(requestId, accessToken);
      setRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId)
      );
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
        setRequests((currentRequests) =>
          currentRequests.filter((request) => request.id !== requestId)
        );
        return;
      }

      if (error instanceof ApiClientError) {
        window.alert(error.message);
        return;
      }

      window.alert("Istek silinirken beklenmeyen bir hata olustu.");
    } finally {
      setDeletingRequestId((currentRequestId) =>
        currentRequestId === requestId ? null : currentRequestId
      );
    }
  };

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
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
      description="Yalnizca giris yapan musteriye ait aktif transport request kayitlari listelenir."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Istekler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStatCard
            label="Toplam istek"
            value={requests.length}
            hint="Panelde gorunen aktif kayitlar."
          />
          <SummaryStatCard
            label="Acik akista"
            value={activeCount}
            hint="Henuz anlasilma veya tamamlama noktasina gelmeyen istekler."
          />
          <SummaryStatCard
            label="Anlasilan is"
            value={agreementCount}
            hint="Teklif kabul edilmis veya tamamlanmis kayitlar."
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && requests.length === 0 ? (
        <EmptyStateCard
          eyebrow="Istek akisi"
          title="Henuz istek yok"
          description="Ilk transport request kaydini olusturdugunda yonetim listesi burada belirecek."
          actionHref="/dashboard/istek_ekle"
          actionLabel="Ilk istegi olustur"
        />
      ) : null}

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((request) => {
            const isDeleting = deletingRequestId === request.id;

            return (
              <div
                key={request.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <StatusBadge status={request.durum} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Istek #{request.id}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">
                        {request.baslangicSehri} {"->"} {request.varisSehri}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-slate-600 line-clamp-3">
                        {request.yukDetay}
                      </p>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Olusturma zamani: {formatDate(request.olusturmaTarihi)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:min-w-[250px] lg:items-end">
                    <p className="text-sm text-slate-500">
                      Detay, duzenleme ve silme aksiyonlari bu kayit uzerinden devam eder.
                    </p>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Link
                        href={`/dashboard/isteklerim/${request.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Detay
                      </Link>
                      <Link
                        href={`/dashboard/isteklerim/${request.id}/duzenle`}
                        className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        Duzenle
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(request.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? "Siliniyor..." : "Sil"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
