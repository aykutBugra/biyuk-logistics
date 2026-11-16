"use client";

import NotificationsWorkspace from "@/features/customer-workspace/NotificationsWorkspace";
import { PageHeader } from "@/components/ui";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerMetricCard from "@/components/CustomerMetricCard";

import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationListItem,
} from "@/lib/api/notifications";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";
import { emitNotificationsChanged } from "@/lib/notifications/notification-events";

type NotificationFilter =
  | "all"
  | "offers"
  | "messages"
  | "operations"
  | "ratings"
  | "other";

type ActingNotificationAction = "mark" | "open" | null;

type NotificationVisualModel = {
  label: string;
  icon: string;
  boxClassName: string;
  iconClassName: string;
};

const BASE_NOTIFICATION_FILTERS: Array<{
  id: Exclude<NotificationFilter, "other">;
  label: string;
}> = [
  { id: "all", label: "Tumu" },
  { id: "offers", label: "Teklif / Pazarlik" },
  { id: "messages", label: "Mesaj" },
  { id: "operations", label: "Operasyon" },
  { id: "ratings", label: "Puan" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function getTypeLabel(value: string): string {
  switch (value.trim().toUpperCase()) {
    case "TEKLIF_GELDI":
      return "Teklif";
    case "TEKLIF_KABUL_EDILDI":
      return "Kabul";
    case "TEKLIF_REDDEDILDI":
      return "Red";
    case "MESAJ_GELDI":
      return "Mesaj";
    case "KARSI_TEKLIF_GELDI":
      return "Pazarlik";
    case "IS_BASLADI":
      return "Is";
    case "TESLIM_ONAYI_BEKLIYOR":
      return "Onay";
    case "IS_TAMAMLANDI":
      return "Teslim";
    case "RATING_ALDIN":
      return "Puan";
    case "RATING_BEKLIYOR":
      return "Hatirlatma";
    default:
      return "Bildirim";
  }
}

function resolveNotificationFilter(value: string): Exclude<NotificationFilter, "all"> {
  switch (value.trim().toUpperCase()) {
    case "TEKLIF_GELDI":
    case "TEKLIF_KABUL_EDILDI":
    case "TEKLIF_REDDEDILDI":
    case "KARSI_TEKLIF_GELDI":
      return "offers";
    case "MESAJ_GELDI":
      return "messages";
    case "IS_BASLADI":
    case "TESLIM_ONAYI_BEKLIYOR":
    case "IS_TAMAMLANDI":
      return "operations";
    case "RATING_ALDIN":
    case "RATING_BEKLIYOR":
      return "ratings";
    default:
      return "other";
  }
}

function resolveOpenLabel(hedefUrl: string): string {
  if (hedefUrl.startsWith("/dashboard/konusmalar/teklif/")) {
    return "Konusmaya git";
  }

  if (hedefUrl.startsWith("/dashboard/isteklerim/")) {
    return "Istek detayina git";
  }

  if (hedefUrl.startsWith("/dashboard/nakliyelerim/")) {
    return "Nakliyeyi ac";
  }

  if (hedefUrl.startsWith("/dashboard/puanlarim")) {
    return "Puanlarimi gor";
  }

  return "Ac";
}

function resolveNotificationVisualModel(tip: string): NotificationVisualModel {
  switch (tip.trim().toUpperCase()) {
    case "TEKLIF_GELDI":
      return {
        label: "Teklif",
        icon: "pi pi-wallet",
        boxClassName: "border-emerald-100 bg-emerald-50",
        iconClassName: "text-emerald-700",
      };
    case "TEKLIF_KABUL_EDILDI":
      return {
        label: "Kabul",
        icon: "pi pi-check-circle",
        boxClassName: "border-blue-100 bg-blue-50",
        iconClassName: "text-blue-700",
      };
    case "TEKLIF_REDDEDILDI":
      return {
        label: "Red",
        icon: "pi pi-times-circle",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    case "MESAJ_GELDI":
      return {
        label: "Mesaj",
        icon: "pi pi-comments",
        boxClassName: "border-blue-100 bg-blue-50",
        iconClassName: "text-blue-700",
      };
    case "KARSI_TEKLIF_GELDI":
      return {
        label: "Pazarlik",
        icon: "pi pi-refresh",
        boxClassName: "border-violet-100 bg-violet-50",
        iconClassName: "text-violet-700",
      };
    case "IS_BASLADI":
      return {
        label: "Is",
        icon: "pi pi-truck",
        boxClassName: "border-blue-100 bg-blue-50",
        iconClassName: "text-blue-700",
      };
    case "TESLIM_ONAYI_BEKLIYOR":
      return {
        label: "Onay",
        icon: "pi pi-clock",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    case "IS_TAMAMLANDI":
      return {
        label: "Teslim",
        icon: "pi pi-check",
        boxClassName: "border-emerald-100 bg-emerald-50",
        iconClassName: "text-emerald-700",
      };
    case "RATING_ALDIN":
      return {
        label: "Puan",
        icon: "pi pi-star-fill",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    case "RATING_BEKLIYOR":
      return {
        label: "Hatirlatma",
        icon: "pi pi-clock",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    default:
      return {
        label: "Bildirim",
        icon: "pi pi-bell",
        boxClassName: "border-slate-200 bg-slate-100",
        iconClassName: "text-slate-600",
      };
  }
}

// Bildirim tipi/okunma durumuna gore aktif filtreye uyup uymadigini kontrol eder.
function matchesNotificationFilter(
  notification: NotificationListItem,
  filter: NotificationFilter
): boolean {
  if (filter === "all") {
    return true;
  }

  return resolveNotificationFilter(notification.tip) === filter;
}

// Bildirim aramasi baslik, mesaj, tip ve hedef URL metinleri uzerinden yapilir.
function matchesNotificationSearch(
  notification: NotificationListItem,
  query: string
): boolean {
  if (!query) {
    return true;
  }

  const searchableText = [
    notification.baslik,
    notification.mesaj,
    getTypeLabel(notification.tip),
    notification.tip,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return searchableText.includes(query);
}

// Bildirimler okunmamis olanlar ve en yeni hareketler one gelecek sekilde siralanir.
function sortCarrierNotifications(
  left: NotificationListItem,
  right: NotificationListItem
): number {
  if (left.isRead !== right.isRead) {
    return left.isRead ? 1 : -1;
  }

  return (
    new Date(right.olusturmaTarihi).getTime() -
    new Date(left.olusturmaTarihi).getTime()
  );
}

// Tek bildirim karti; okundu isareti ve hedef route acma aksiyonlarini tasir.
function CarrierNotificationCard({
  notification,
  isActing = false,
  actingAction = null,
  onMarkAsRead,
  onOpen,
}: {
  notification: NotificationListItem;
  isActing?: boolean;
  actingAction?: ActingNotificationAction;
  onMarkAsRead: () => void;
  onOpen: () => void;
}) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();
  const visualModel = resolveNotificationVisualModel(notification.tip);
  const openLabel = notification.hedefUrl
    ? resolveOpenLabel(notification.hedefUrl)
    : null;

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white p-4 shadow-sm transition-colors will-change-transform md:p-5 ${
        notification.isRead
          ? "border-slate-200 hover:border-blue-200"
          : "border-blue-200 bg-blue-50/40 shadow-[0_14px_34px_rgba(37,99,235,0.08)]"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${visualModel.boxClassName} ${visualModel.iconClassName}`}
          >
            <i className={`${visualModel.icon} text-lg`} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CustomerWorkspaceSignalPill
                tone={notification.isRead ? "slate" : "blue"}
                label={notification.isRead ? "Okundu" : "Okunmamis"}
              />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {visualModel.label}
              </span>
            </div>

            <h2 className="mt-3 text-[1.4rem] font-black tracking-tight text-slate-950">
              {notification.baslik}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {notification.mesaj}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:min-w-[230px] xl:items-end">
          <div className="xl:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Kayit tarihi
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {formatDate(notification.olusturmaTarihi)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {!notification.isRead ? (
              <button
                type="button"
                onClick={onMarkAsRead}
                disabled={isActing}
                className="app-button-secondary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActing && actingAction === "mark" ? "Isleniyor..." : "Okundu say"}
              </button>
            ) : null}

            {notification.hedefUrl && openLabel ? (
              <button
                type="button"
                onClick={onOpen}
                disabled={isActing}
                className="app-button-primary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActing && actingAction === "open" ? "Aciliyor..." : openLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

// Hesap bildirimlerini listeler, okundu durumlarini ve toplu okundu aksiyonunu yonetir.
export default function NotificationsPage() {
  const router = useRouter();
  const {
    accessToken,
    hasBusinessAccess,
    isAdmin,
    isCarrierWorkspace,
    isCustomerWorkspace,
    primaryRole,
    status,
  } = useDashboardAccess("shared-account");
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingAction, setActingAction] =
    useState<ActingNotificationAction>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<NotificationFilter>("all");

  useEffect(() => {
    // Account guard hazir olmadan bildirim endpoint'i cagrilmaz.
    if (status !== "ready" || !accessToken) {
      return;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        // Bildirim listesi okundukca topbar sayaclari event ile tazelenir.
        setIsLoading(true);
        setErrorMessage(null);

        const [listResponse, countResponse] = await Promise.all([
          getMyNotifications(accessToken),
          getMyUnreadNotificationCount(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setNotifications(listResponse);
        setUnreadCount(countResponse.unreadCount);
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
            : "Bildirimler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  // Ortak auth hata yakalama helper'i tekli/toplu aksiyonlarda tekrar kullanilir.
  const handleAuthError = (error: unknown): boolean => {
    if (error instanceof ApiClientError && error.status === 401) {
      clearStoredAuth();
      router.replace("/login");
      return true;
    }

    if (error instanceof ApiClientError && error.status === 403) {
      router.replace("/");
      return true;
    }

    return false;
  };

  const applyUpdatedNotification = (
    notificationId: string,
    updatedNotification: NotificationListItem
  ) => {
    setNotifications((currentNotifications) => {
      const previousNotification = currentNotifications.find(
        (notification) => notification.id === notificationId
      );
      const shouldDecrementUnread =
        previousNotification !== undefined &&
        previousNotification.isRead === false &&
        updatedNotification.isRead === true;

      if (shouldDecrementUnread) {
        setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
      }

      return currentNotifications.map((notification) =>
        notification.id === notificationId ? updatedNotification : notification
      );
    });
    emitNotificationsChanged();
  };

  // Tek bildirimi okundu yapar ve local listeyi backend cevabiyla gunceller.
  const handleMarkAsRead = async (notificationId: string) => {
    if (!accessToken || actingId !== null) {
      return;
    }

    try {
      setActingId(notificationId);
      setActingAction("mark");
      const updatedNotification = await markNotificationAsRead(
        notificationId,
        accessToken
      );

      applyUpdatedNotification(notificationId, updatedNotification);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Bildirim okundu olarak isaretlenirken beklenmeyen bir hata olustu."
      );
    } finally {
      setActingId(null);
      setActingAction(null);
    }
  };

  // Bildirim tiklaninca gerekiyorsa once okundu isaretlenir, sonra hedef route'a gidilir.
  const handleOpenNotification = async (notification: NotificationListItem) => {
    if (!accessToken) {
      return;
    }

    if (!notification.hedefUrl) {
      if (!notification.isRead) {
        await handleMarkAsRead(notification.id);
      }
      return;
    }

    if (!notification.isRead) {
      try {
        setActingId(notification.id);
        setActingAction("open");
        const updatedNotification = await markNotificationAsRead(
          notification.id,
          accessToken
        );

        applyUpdatedNotification(notification.id, updatedNotification);
      } catch (error) {
        if (handleAuthError(error)) {
          return;
        }

        window.alert(
          error instanceof ApiClientError
            ? error.message
            : "Bildirim acilirken beklenmeyen bir hata olustu."
        );
        setActingId(null);
        return;
      } finally {
        setActingId(null);
        setActingAction(null);
      }
    }

    router.push(notification.hedefUrl);
  };

  // Tum okunmamis bildirimler backend'de okundu yapilir ve local listeye yansitilir.
  const handleMarkAllAsRead = async () => {
    if (!accessToken || isMarkingAll || unreadCount === 0) {
      return;
    }

    try {
      setIsMarkingAll(true);
      const response = await markAllNotificationsAsRead(accessToken);

      if (response.updatedCount > 0) {
        setNotifications((currentNotifications) =>
          currentNotifications.map((notification) =>
            notification.isRead
              ? notification
              : {
                  ...notification,
                  isRead: true,
                  okunmaTarihi: new Date().toISOString(),
                }
          )
        );
      }

      setUnreadCount(0);
      emitNotificationsChanged();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Bildirimler guncellenirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const listedUnreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const listedReadCount = notifications.filter(
    (notification) => notification.isRead
  ).length;
  const offerNotificationCount = notifications.filter(
    (notification) => resolveNotificationFilter(notification.tip) === "offers"
  ).length;
  const hasOtherNotifications = notifications.some(
    (notification) => resolveNotificationFilter(notification.tip) === "other"
  );
  const availableFilters = hasOtherNotifications
    ? [...BASE_NOTIFICATION_FILTERS, { id: "other" as const, label: "Diger" }]
    : BASE_NOTIFICATION_FILTERS;
  const normalizedSearchQuery = normalizeText(searchQuery);
  const filteredNotifications = notifications.filter(
    (notification) =>
      matchesNotificationFilter(notification, selectedFilter) &&
      matchesNotificationSearch(notification, normalizedSearchQuery)
  );
  const filteredCarrierNotifications = [...filteredNotifications].sort(
    sortCarrierNotifications
  );
  const isFallbackAccountView = !isCustomerWorkspace && !isCarrierWorkspace;

  if (isCustomerWorkspace || isCarrierWorkspace) {
    return (
      <DashboardShell title="Bildirimler" headerVariant="compact" motionPreset="operational" cardMotionLimit={6} unreadNotificationCount={unreadCount}
        pageHeader={<PageHeader title="Bildirimler" description="Teklif, mesaj ve taşıma hareketlerinden haberdar olun." />}>
        <NotificationsWorkspace notifications={notifications} visibleNotifications={isCarrierWorkspace ? filteredCarrierNotifications : filteredNotifications} unreadCount={unreadCount}
          emptyHref={isCarrierWorkspace ? "/dashboard/acik_istekler" : "/dashboard/isteklerim"}
          query={searchQuery} filter={selectedFilter} hasOtherNotifications={hasOtherNotifications}
          onQueryChange={setSearchQuery} onFilterChange={setSelectedFilter}
          onMarkAll={() => void handleMarkAllAsRead()} onMarkAsRead={(id) => void handleMarkAsRead(id)}
          onOpen={(notification) => void handleOpenNotification(notification)}
          actingId={actingId} actingAction={actingAction} isMarkingAll={isMarkingAll}
          isLoading={isLoading} errorMessage={errorMessage} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Bildirimler"
      description={
        isCustomerWorkspace
          ? "Sana gelen sistem olaylari, teklif hareketleri ve hatirlatmalar tek inbox altinda toplanir."
          : "Sistem olaylari, teklif hareketleri ve hatirlatmalar tek inbox altinda toplanir."
      }
      headerVariant={isCustomerWorkspace || isCarrierWorkspace ? "compact" : "default"}
      motionPreset={isCustomerWorkspace || isCarrierWorkspace ? "operational" : "default"}
      cardMotionLimit={isCustomerWorkspace || isCarrierWorkspace ? 6 : undefined}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}



      {!isLoading && !errorMessage && isCarrierWorkspace ? (
        <div
          data-dashboard-stats
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <CustomerMetricCard
            label="Toplam bildirim"
            value={notifications.length}
            hint="Son hareket kutun"
            tone="blue"
            icon={<i className="pi pi-bell text-lg" />}
          />
          <CustomerMetricCard
            label="Okunmamis"
            value={unreadCount}
            hint="Takip bekleyen bildirimler"
            tone="violet"
            icon={<i className="pi pi-envelope text-lg" />}
          />
          <CustomerMetricCard
            label="Okunmus"
            value={Math.max(0, notifications.length - unreadCount)}
            hint="Incelenmis kayitlar"
            tone="emerald"
            icon={<i className="pi pi-check-circle text-lg" />}
          />
          <CustomerMetricCard
            label="Teklif / pazarlik"
            value={offerNotificationCount}
            hint="Teklif akisinla ilgili bildirimler"
            tone="amber"
            icon={<i className="pi pi-wallet text-lg" />}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && isFallbackAccountView ? (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryStatCard label="Toplam bildirim" value={notifications.length} />
          <SummaryStatCard label="Okunmamis" value={unreadCount} />
          <SummaryStatCard
            label="Okunmus"
            value={Math.max(0, notifications.length - unreadCount)}
          />
        </div>
      ) : null}



      {!isLoading &&
      !errorMessage &&
      isCarrierWorkspace &&
      notifications.length === 0 ? (
        <div data-dashboard-primary className="mt-6">
          <EmptyStateCard
            title="Henuz bildirim yok"
            description="Teklif hareketleri, mesajlar ve hatirlatmalar olustukca burada listelenecek."
            actionHref="/dashboard/acik_istekler"
            actionLabel="Acik istekleri incele"
          />
        </div>
      ) : null}

      {!isLoading &&
      !errorMessage &&
      isFallbackAccountView &&
      notifications.length === 0 ? (
        <EmptyStateCard
          title="Henuz bildirim yok"
          description="Yeni bildirimlerin burada listelenecek."
          actionHref={
            !hasBusinessAccess && isAdmin
              ? "/dashboard/admin"
              : primaryRole === "NAKLIYECI"
                ? "/dashboard/acik_istekler"
                : "/dashboard/isteklerim"
          }
          actionLabel={
            !hasBusinessAccess && isAdmin
              ? "Yonetim alanina git"
              : primaryRole === "NAKLIYECI"
                ? "Acik istekleri gor"
                : "Isteklerime git"
          }
        />
      ) : null}



      {!isLoading && !errorMessage && isCarrierWorkspace && notifications.length > 0 ? (
        <div data-dashboard-primary className="mt-6">
          <CustomerSectionSurface
            title="Bildirim merkezi"
            count={filteredCarrierNotifications.length}
            description="Bildirimlerini tip, icerik ve son hareket baglamiyla birlikte tek listede yonet."
            action={
              <div className="flex flex-wrap gap-2">
                <CustomerWorkspaceSignalPill
                  tone="blue"
                  label={`${unreadCount} okunmamis`}
                />
                <CustomerWorkspaceSignalPill
                  tone="amber"
                  label={`${offerNotificationCount} teklif / pazarlik`}
                />
                <CustomerWorkspaceSignalPill
                  tone="slate"
                  label={`${listedReadCount} okundu`}
                />
              </div>
            }
          >
            <div className="space-y-4">
              <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingAll || unreadCount === 0}
                        className="app-button-secondary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMarkingAll ? "Guncelleniyor..." : "Tumunu okundu say"}
                      </button>
                      {unreadCount > listedUnreadCount ? (
                        <CustomerWorkspaceSignalPill
                          tone="amber"
                          label={`Listede ${listedUnreadCount} okunmamis gorunuyor`}
                        />
                      ) : null}
                    </div>

                    <label className="relative block w-full xl:max-w-md">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <i className="pi pi-search text-sm" />
                      </span>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Baslik, mesaj veya bildirim tipi ara..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableFilters.map((filter) => {
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
              </section>

              {filteredCarrierNotifications.length === 0 ? (
                <EmptyStateCard
                  eyebrow="Filtre sonucu"
                  title="Filtreye uyan bildirim bulunamadi"
                  description="Arama metnini veya secili grubu temizleyerek son kayitlarini tekrar goruntuleyebilirsin."
                />
              ) : (
                <div className="grid gap-4">
                  {filteredCarrierNotifications.map((notification) => (
                    <CarrierNotificationCard
                      key={notification.id}
                      notification={notification}
                      isActing={actingId === notification.id}
                      actingAction={
                        actingId === notification.id ? actingAction : null
                      }
                      onMarkAsRead={() => void handleMarkAsRead(notification.id)}
                      onOpen={() => void handleOpenNotification(notification)}
                    />
                  ))}
                </div>
              )}
            </div>
          </CustomerSectionSurface>
        </div>
      ) : null}

      {!isLoading &&
      !errorMessage &&
      isFallbackAccountView &&
      notifications.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-600">Okunmamis bildirimlerini yonet.</p>
            </div>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || unreadCount === 0}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMarkingAll ? "Guncelleniyor..." : "Tumunu okundu say"}
            </button>
          </div>

          <div className="grid gap-4">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 shadow-sm transition-colors ${
                  notification.isRead
                    ? "border-slate-200 bg-white"
                    : "border-blue-200 bg-blue-50/60"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          notification.isRead
                            ? "bg-slate-100 text-slate-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {notification.isRead ? "Okundu" : "Okunmadi"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {getTypeLabel(notification.tip)}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-950">
                        {notification.baslik}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {notification.mesaj}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:min-w-[210px] lg:items-end">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {formatDate(notification.olusturmaTarihi)}
                    </p>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkAsRead(notification.id)}
                          disabled={actingId === notification.id}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actingId === notification.id ? "Isleniyor..." : "Okundu say"}
                        </button>
                      ) : null}
                      {notification.hedefUrl ? (
                        <button
                          type="button"
                          onClick={() => void handleOpenNotification(notification)}
                          disabled={actingId === notification.id}
                          className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actingId === notification.id ? "Aciliyor..." : "Ac"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
