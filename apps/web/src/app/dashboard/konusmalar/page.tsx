"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerConversationCard from "@/components/CustomerConversationCard";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
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

type ConversationFilter = "all" | "unread" | "open" | "closed";

const CUSTOMER_FILTERS: Array<{
  id: ConversationFilter;
  label: string;
}> = [
  { id: "all", label: "Tumu" },
  { id: "unread", label: "Okunmamis" },
  { id: "open", label: "Acik" },
  { id: "closed", label: "Kapali" },
];

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

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

function getOfferStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Bekliyor";
    case "KABUL_EDILDI":
      return "Kabul edildi";
    case "REDDEDILDI":
      return "Reddedildi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function matchesConversationFilter(
  thread: OfferThreadSummary,
  filter: ConversationFilter
): boolean {
  switch (filter) {
    case "unread":
      return thread.hasUnread;
    case "open":
      return !thread.isClosed;
    case "closed":
      return thread.isClosed;
    default:
      return true;
  }
}

function matchesConversationSearch(
  thread: OfferThreadSummary,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const routeTitle = `${formatLocationLabel(
    thread.baslangicKonumMetni,
    thread.baslangicSehri
  )} ${thread.baslangicSehri} ${formatLocationLabel(
    thread.varisKonumMetni,
    thread.varisSehri
  )} ${thread.varisSehri}`;

  const searchableText = [
    routeTitle,
    thread.karsiTarafAdSoyad,
    thread.karsiTarafKullaniciAdi,
    thread.lastMessageSummary ?? "",
    `teklif ${thread.offerId}`,
    `istek ${thread.requestId}`,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return searchableText.includes(query);
}

export default function OfferThreadsPage() {
  const router = useRouter();
  const { accessToken, isCarrierWorkspace, isCustomerWorkspace, primaryRole, status } =
    useDashboardAccess("shared-business");
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<ConversationFilter>("all");

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

  const normalizedSearchQuery = normalizeText(searchQuery);
  const unreadCount = threads.filter((thread) => thread.hasUnread).length;
  const activeCount = threads.filter((thread) => !thread.isClosed).length;
  const closedCount = threads.filter((thread) => thread.isClosed).length;
  const filteredThreads = threads.filter(
    (thread) =>
      matchesConversationFilter(thread, selectedFilter) &&
      matchesConversationSearch(thread, normalizedSearchQuery)
  );

  return (
    <DashboardShell
      title="Konusmalar"
      description={
        isCarrierWorkspace
          ? "Nakliyeci baglamindaki teklif konusmalarini ve okunmamis akislari takip et."
          : "Musteri baglamindaki teklif konusmalarini ve pazarlik akislarini yonet."
      }
      pageEyebrow={isCustomerWorkspace ? "Calisma alani" : undefined}
      headerVariant={isCustomerWorkspace ? "compact" : "default"}
      motionPreset={isCustomerWorkspace ? "operational" : "default"}
      cardMotionLimit={isCustomerWorkspace ? 6 : undefined}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && isCustomerWorkspace ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CustomerMetricCard
            label="Toplam thread"
            value={threads.length}
            hint="Tum teklif konusmalarin"
            tone="blue"
            icon={<i className="pi pi-comments text-lg" />}
          />
          <CustomerMetricCard
            label="Okunmamis"
            value={unreadCount}
            hint="Incelemen bekleyen akislari gosterir"
            tone="violet"
            icon={<i className="pi pi-envelope text-lg" />}
          />
          <CustomerMetricCard
            label="Aktif pazarlik"
            value={activeCount}
            hint="Devam eden gorusmeler"
            tone="emerald"
            icon={<i className="pi pi-refresh text-lg" />}
          />
          <CustomerMetricCard
            label="Kapali"
            value={closedCount}
            hint="Tamamlanan veya kapanan akislar"
            tone="amber"
            icon={<i className="pi pi-lock text-lg" />}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && !isCustomerWorkspace && threads.length > 0 ? (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryStatCard label="Toplam thread" value={threads.length} />
          <SummaryStatCard label="Okunmamis" value={unreadCount} />
          <SummaryStatCard label="Kapali" value={closedCount} />
        </div>
      ) : null}

      {!isLoading && !errorMessage && isCustomerWorkspace ? (
        threads.length === 0 ? (
          <div className="mt-6">
            <EmptyStateCard
              eyebrow="Konusma kutusu"
              title="Henuz konusma yok"
              description="Teklif akisi olustugunda teklif gorusmelerin burada listelenecek. Gelen teklifleri veya aktif isteklerini acarak sonraki adima gecebilirsin."
              actionHref="/dashboard/gelen_teklifler"
              actionLabel="Gelen teklifleri gor"
            />
          </div>
        ) : (
          <div className="mt-6">
            <CustomerSectionSurface
              title="Tum konusmalar"
              count={filteredThreads.length}
              description="Teklif konusmalarini rota, durum ve mevcut aksiyonlariyla birlikte tek listede yonet."
              action={
                <div className="flex flex-wrap gap-2">
                  <CustomerWorkspaceSignalPill
                    tone="blue"
                    label={`${unreadCount} okunmamis`}
                  />
                  <CustomerWorkspaceSignalPill
                    tone="emerald"
                    label={`${activeCount} acik`}
                  />
                  <CustomerWorkspaceSignalPill
                    tone="slate"
                    label={`${closedCount} kapali`}
                  />
                </div>
              }
            >
              <div className="space-y-4">
                <div className="app-surface-muted rounded-[1.35rem] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <label className="relative block w-full lg:max-w-md">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <i className="pi pi-search text-sm" />
                      </span>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Konusma, rota veya taraf ara"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {CUSTOMER_FILTERS.map((filter) => {
                        const isActive = selectedFilter === filter.id;

                        return (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() => setSelectedFilter(filter.id)}
                            className={`app-pressable inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {filteredThreads.length === 0 ? (
                  <EmptyStateCard
                    eyebrow="Filtre sonucu"
                    title="Filtreye uyan konusma bulunamadi"
                    description="Arama metnini veya secili durumu temizleyerek tum thread'leri tekrar goruntuleyebilirsin."
                  />
                ) : (
                  <div className="grid gap-4">
                    {filteredThreads.map((thread) => (
                      <CustomerConversationCard
                        key={thread.id}
                        thread={thread}
                        conversationHref={`/dashboard/konusmalar/teklif/${thread.offerId}`}
                        requestHref={`/dashboard/isteklerim/${thread.requestId}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CustomerSectionSurface>
          </div>
        )
      ) : null}

      {!isLoading && !errorMessage && !isCustomerWorkspace && threads.length === 0 ? (
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

      {!isLoading && !errorMessage && !isCustomerWorkspace && threads.length > 0 ? (
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
                      {"->"}{" "}
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
