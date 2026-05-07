"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyOfferThreads,
  type OfferThreadSummary,
} from "@/lib/api/offer-threads";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";
import { formatLocationLabel } from "@/lib/logistics";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function OfferThreadsPage() {
  const router = useRouter();
  const { accessToken, isCarrierWorkspace, primaryRole, status } =
    useDashboardAccess("shared-business");
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
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

    const loadThreads = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyOfferThreads(accessToken, {
          as: primaryRole === "NAKLIYECI" ? "carrier" : "customer",
        });

        if (!isMounted) {
          return;
        }

        setThreads(response);
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
            : "Konusmalar yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadThreads();

    return () => {
      isMounted = false;
    };
  }, [accessToken, primaryRole, router, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const unreadCount = threads.filter((thread) => thread.hasUnread).length;
  const closedCount = threads.filter((thread) => thread.isClosed).length;

  return (
    <DashboardShell
      title="Konusmalar"
      description={
        isCarrierWorkspace
          ? "Nakliyeci baglamindaki teklif konusmalarini ve okunmamis akislari takip et."
          : "Musteri baglamindaki teklif konusmalarini ve pazarlik akislarini yonet."
      }
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && threads.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryStatCard label="Toplam thread" value={threads.length} />
          <SummaryStatCard label="Okunmamis" value={unreadCount} />
          <SummaryStatCard label="Kapali" value={closedCount} />
        </div>
      ) : null}

      {!isLoading && !errorMessage && threads.length === 0 ? (
        <EmptyStateCard
          title="Henuz konusma yok"
          description="Teklif olustukca veya sana teklif geldikce ilgili konusmalar burada listelenecek."
          actionHref={
            primaryRole === "NAKLIYECI"
              ? "/dashboard/acik_istekler"
              : "/dashboard/gelen_teklifler"
          }
          actionLabel={
            primaryRole === "NAKLIYECI"
              ? "Acik istekleri incele"
              : "Gelen teklifleri gor"
          }
        />
      ) : null}

      {!isLoading && !errorMessage && threads.length > 0 ? (
        <div className="grid gap-4">
          {threads.map((thread) => (
            <article
              key={thread.id}
              className={`rounded-2xl border p-6 shadow-sm transition-colors ${
                thread.hasUnread
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        thread.isClosed
                          ? "bg-slate-100 text-slate-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {thread.isClosed ? "Kapali" : "Aktif"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Teklif #{thread.offerId}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Istek #{thread.requestId}
                    </span>
                    {thread.hasUnread ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {thread.unreadCount} okunmamis
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {formatLocationLabel(
                        thread.baslangicKonumMetni,
                        thread.baslangicSehri
                      )}{" "}
                      →{" "}
                      {formatLocationLabel(
                        thread.varisKonumMetni,
                        thread.varisSehri
                      )}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {thread.karsiTarafAdSoyad}{" "}
                      <span className="text-slate-500">
                        @{thread.karsiTarafKullaniciAdi}
                      </span>
                    </p>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {thread.lastMessageSummary ?? "Konusma hazir."}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-[240px] flex-col items-start gap-3 lg:items-end">
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {formatCurrency(thread.fiyat)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {formatDate(thread.lastMessageAt ?? thread.closedAt)}
                  </p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      href={`/dashboard/konusmalar/teklif/${thread.offerId}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Konusmaya git
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </DashboardShell>
  );
}
