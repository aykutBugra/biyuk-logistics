"use client";

import ConversationsWorkspace from "@/features/customer-workspace/ConversationsWorkspace";
import { PageHeader } from "@/components/ui";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyOfferThreads,
  type OfferThreadSummary,
} from "@/lib/api/offer-threads";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";
import { formatDateOnly } from "@/lib/date-only";
import { formatLocationLabel } from "@/lib/logistics";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type CustomerConversationFilter = "all" | "unread" | "open" | "closed";
type CarrierConversationFilter = "all" | "pending" | "active" | "closed";

const CUSTOMER_FILTERS: Array<{
  id: CustomerConversationFilter;
  label: string;
}> = [
  { id: "all", label: "Tumu" },
  { id: "unread", label: "Okunmamis" },
  { id: "open", label: "Acik" },
  { id: "closed", label: "Kapali" },
];

const CARRIER_FILTERS: Array<{
  id: CarrierConversationFilter;
  label: string;
}> = [
  { id: "all", label: "Tumu" },
  { id: "pending", label: "Bekleyen" },
  { id: "active", label: "Aktif" },
  { id: "closed", label: "Kapali" },
];

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
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
  switch (normalizeStatus(status)) {
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

function getThreadRouteTitle(thread: OfferThreadSummary): string {
  return `${formatLocationLabel(
    thread.baslangicKonumMetni,
    thread.baslangicSehri
  )} -> ${formatLocationLabel(thread.varisKonumMetni, thread.varisSehri)}`;
}

function getConversationPreview(thread: OfferThreadSummary): string {
  if (thread.lastMessageSummary?.trim()) {
    return thread.lastMessageSummary;
  }

  if (thread.isClosed) {
    return "Konusma tamamlandi.";
  }

  if (normalizeStatus(thread.durum) === "OLUSTURULDU") {
    return "Musteri yaniti bekleniyor.";
  }

  return "Konusma akisi hazir.";
}

// Nakliyeci tarafinda henuz cevap bekleyen konusmalari ayirt eder.
function isCarrierPendingConversation(thread: OfferThreadSummary): boolean {
  return !thread.isClosed && normalizeStatus(thread.durum) === "OLUSTURULDU";
}

function isCarrierActiveConversation(thread: OfferThreadSummary): boolean {
  return !thread.isClosed && !isCarrierPendingConversation(thread);
}

function resolveCarrierConversationStatusLabel(
  thread: OfferThreadSummary
): "Bekliyor" | "Aktif" | "Kapali" {
  if (thread.isClosed) {
    return "Kapali";
  }

  if (isCarrierPendingConversation(thread)) {
    return "Bekliyor";
  }

  return "Aktif";
}

function resolveCarrierConversationStatusValue(
  thread: OfferThreadSummary
): "BEKLIYOR" | "AKTIF" | "KAPALI" {
  if (thread.isClosed) {
    return "KAPALI";
  }

  if (isCarrierPendingConversation(thread)) {
    return "BEKLIYOR";
  }

  return "AKTIF";
}

function canOpenCarrierRequestDetail(thread: OfferThreadSummary): boolean {
  return isCarrierPendingConversation(thread);
}

// Thread musteri rolundeki filtre sekmesine uygun mu kontrol edilir.
function matchesCustomerConversationFilter(
  thread: OfferThreadSummary,
  filter: CustomerConversationFilter
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

// Thread nakliyeci rolundeki filtre sekmesine uygun mu kontrol edilir.
function matchesCarrierConversationFilter(
  thread: OfferThreadSummary,
  filter: CarrierConversationFilter
): boolean {
  switch (filter) {
    case "pending":
      return isCarrierPendingConversation(thread);
    case "active":
      return isCarrierActiveConversation(thread);
    case "closed":
      return thread.isClosed;
    default:
      return true;
  }
}

// Arama, taraf adi, kullanici adi, rota ve son mesaj metni uzerinden yapilir.
function matchesConversationSearch(
  thread: OfferThreadSummary,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const searchableText = [
    getThreadRouteTitle(thread),
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

// Nakliyeci konusmalarinda once okunmamislar, sonra son hareket tarihi one gelir.
function sortCarrierThreads(
  left: OfferThreadSummary,
  right: OfferThreadSummary
): number {
  if (left.hasUnread !== right.hasUnread) {
    return left.hasUnread ? -1 : 1;
  }

  return (
    new Date(right.lastMessageAt ?? right.closedAt ?? 0).getTime() -
    new Date(left.lastMessageAt ?? left.closedAt ?? 0).getTime()
  );
}

// Nakliyeci tarafina ozel konusma karti; musteri kartindan farkli aksiyon linkleri tasir.
function CarrierConversationCard({
  thread,
}: {
  thread: OfferThreadSummary;
}) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();
  const updatedAt = thread.lastMessageAt ?? thread.closedAt;
  const requestHref = canOpenCarrierRequestDetail(thread)
    ? `/dashboard/acik_istekler/${thread.requestId}`
    : null;

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.4rem] border bg-white p-4 shadow-sm transition-colors will-change-transform md:p-5 ${
        thread.hasUnread
          ? "border-blue-200 shadow-[0_14px_34px_rgba(37,99,235,0.08)]"
          : "border-slate-200 hover:border-blue-200"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={resolveCarrierConversationStatusValue(thread)}
              label={resolveCarrierConversationStatusLabel(thread)}
            />
            {thread.hasUnread ? (
              <CustomerWorkspaceSignalPill
                tone="blue"
                label={`${thread.unreadCount} okunmamis mesaj`}
              />
            ) : null}
          </div>

          <div className="mt-4 flex min-w-0 gap-4">
            <CustomerInitialsAvatar
              name={thread.karsiTarafAdSoyad}
              fallback={thread.karsiTarafKullaniciAdi}
              imageUrl={thread.karsiTarafProfileImageUrl}
              tone={thread.isClosed ? "slate" : "blue"}
            />

            <div className="min-w-0 flex-1">
              <h3 className="break-words text-[1.65rem] font-black tracking-tight text-slate-950 [overflow-wrap:anywhere]">
                {getThreadRouteTitle(thread)}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {thread.karsiTarafAdSoyad}
                </span>
                <span className="text-slate-400">
                  @{thread.karsiTarafKullaniciAdi}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
                {getConversationPreview(thread)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  Planlanan alim: {formatDateOnly(thread.planlananAlimTarihi)}
                </span>
                {thread.tahminiTeslimTarihi ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    Tahmini teslim: {formatDateOnly(thread.tahminiTeslimTarihi)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:min-w-[260px] xl:items-end">
          <div className="xl:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Teklif tutari
            </p>
            <p className="mt-2 text-[2.15rem] font-black leading-none tracking-tight text-emerald-600">
              {formatCurrency(thread.fiyat)}
            </p>
          </div>

          <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-500 xl:text-right">
            Son hareket: {formatDate(updatedAt)}
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {requestHref ? (
              <Link href={requestHref} className="app-button-secondary">
                Istek detayi
              </Link>
            ) : null}
            <Link
              href={`/dashboard/konusmalar/teklif/${thread.offerId}`}
              className="app-button-primary"
            >
              Konusmaya git
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// Musteri ve nakliyeci konusmalarini aktif workspace'e gore tek ekranda listeler.
export default function OfferThreadsPage() {
  const access = useDashboardAccess("shared-business");

  return (
    <OfferThreadsPageContent key={access.primaryRole ?? "checking"} access={access} />
  );
}

function OfferThreadsPageContent({
  access,
}: {
  access: ReturnType<typeof useDashboardAccess>;
}) {
  const router = useRouter();
  const { accessToken, isCarrierWorkspace, isCustomerWorkspace, primaryRole, status } =
    access;
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSelectedFilter, setCustomerSelectedFilter] =
    useState<CustomerConversationFilter>("all");
  const [carrierSelectedFilter, setCarrierSelectedFilter] =
    useState<CarrierConversationFilter>("all");

  useEffect(() => {
    // Dashboard guard hazir olmadan thread listesi cagrilmaz.
    if (status !== "ready" || !accessToken) {
      return;
    }

    let isMounted = true;

    const loadThreads = async () => {
      try {
        // Aktif workspace'e gore customer veya carrier thread listesi istenir.
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
  const unreadThreadCount = threads.filter((thread) => thread.hasUnread).length;
  const carrierPendingCount = threads.filter(isCarrierPendingConversation).length;
  const carrierActiveCount = threads.filter(isCarrierActiveConversation).length;
  const closedCount = threads.filter((thread) => thread.isClosed).length;
  const filteredCustomerThreads = threads.filter(
    (thread) =>
      matchesCustomerConversationFilter(thread, customerSelectedFilter) &&
      matchesConversationSearch(thread, normalizedSearchQuery)
  );
  const filteredCarrierThreads = [...threads]
    .filter(
      (thread) =>
        matchesCarrierConversationFilter(thread, carrierSelectedFilter) &&
        matchesConversationSearch(thread, normalizedSearchQuery)
    )
    .sort(sortCarrierThreads);

  if (isCustomerWorkspace || isCarrierWorkspace) {
    return (
      <DashboardShell title="Konuşmalar" headerVariant="compact" motionPreset="operational" cardMotionLimit={6}
        pageHeader={<PageHeader title="Konuşmalar" description="Tekliflerle ilgili mesajlarınızı ve görüşmelerinizi takip edin." />}>
        <ConversationsWorkspace threads={threads} visibleThreads={isCarrierWorkspace ? filteredCarrierThreads : filteredCustomerThreads} query={searchQuery}
          workspace={isCarrierWorkspace ? "carrier" : "customer"} filter={isCarrierWorkspace ? carrierSelectedFilter : customerSelectedFilter}
          onQueryChange={setSearchQuery} onFilterChange={(value) => isCarrierWorkspace ? setCarrierSelectedFilter(value as CarrierConversationFilter) : setCustomerSelectedFilter(value as CustomerConversationFilter)}
          isLoading={isLoading} errorMessage={errorMessage} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Konusmalar"
      description={
        isCarrierWorkspace
          ? "Tekliflerinle ilgili gorusmelerini buradan takip et ve musterilerle iletisimde kal."
          : "Musteri baglamindaki teklif konusmalarini ve pazarlik akislarini yonet."
      }
      pageEyebrow={isCustomerWorkspace ? "Calisma alani" : undefined}
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}



      {!isLoading && !errorMessage && !isCustomerWorkspace ? (
        threads.length === 0 ? (
          <div data-dashboard-primary className="mt-6">
            <EmptyStateCard
              title="Henuz konusma yok"
              description="Teklif verdiginde veya musteriden yanit geldiginde konusmalar burada listelenecek."
              actionHref="/dashboard/acik_istekler"
              actionLabel="Acik istekleri incele"
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div
              data-dashboard-stats
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <CustomerMetricCard
                label="Toplam thread"
                value={threads.length}
                hint="Tum teklif gorusmelerin"
                tone="blue"
                icon={<i className="pi pi-comments text-lg" />}
              />
              <CustomerMetricCard
                label="Okunmamis"
                value={unreadThreadCount}
                hint="Takip bekleyen gorusmeler"
                tone="violet"
                icon={<i className="pi pi-envelope text-lg" />}
              />
              <CustomerMetricCard
                label="Aktif pazarlik"
                value={carrierActiveCount}
                hint="Devam eden operasyonel gorusmeler"
                tone="emerald"
                icon={<i className="pi pi-sync text-lg" />}
              />
              <CustomerMetricCard
                label="Kapali"
                value={closedCount}
                hint="Sonuclanan veya kapanan thread'ler"
                tone="amber"
                icon={<i className="pi pi-lock text-lg" />}
              />
            </div>

            <div data-dashboard-primary>
              <CustomerSectionSurface
                title="Tum konusmalar"
                count={filteredCarrierThreads.length}
                description="Teklif verdigin isleri rota, musteri ve son hareket baglamiyla tek listede takip et."
                action={
                  <div className="flex flex-wrap gap-2">
                    <CustomerWorkspaceSignalPill
                      tone="blue"
                      label={`${unreadThreadCount} okunmamis`}
                    />
                    <CustomerWorkspaceSignalPill
                      tone="amber"
                      label={`${carrierPendingCount} bekleyen`}
                    />
                    <CustomerWorkspaceSignalPill
                      tone="emerald"
                      label={`${carrierActiveCount} aktif`}
                    />
                  </div>
                }
              >
                <div className="space-y-4">
                  <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <label className="relative block w-full xl:max-w-md">
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                          <i className="pi pi-search text-sm" />
                        </span>
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Konusma, rota veya musteri ara..."
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {CARRIER_FILTERS.map((filter) => {
                          const isActive = carrierSelectedFilter === filter.id;

                          return (
                            <button
                              key={filter.id}
                              type="button"
                              onClick={() => setCarrierSelectedFilter(filter.id)}
                              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                                isActive
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {filter.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {filteredCarrierThreads.length === 0 ? (
                    <EmptyStateCard
                      eyebrow="Filtre sonucu"
                      title="Filtreye uyan konusma bulunamadi"
                      description="Aramayi veya durum filtresini degistirerek diger gorusmeleri tekrar listeleyebilirsin."
                    />
                  ) : (
                    <div className="grid gap-4">
                      {filteredCarrierThreads.map((thread) => (
                        <CarrierConversationCard key={thread.id} thread={thread} />
                      ))}
                    </div>
                  )}
                </div>
              </CustomerSectionSurface>
            </div>
          </div>
        )
      ) : null}
    </DashboardShell>
  );
}
