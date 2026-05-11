"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerNotificationCard from "@/components/CustomerNotificationCard";
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
import { emitNotificationsChanged } from "@/lib/notifications/notification-events";

type NotificationFilter =
  | "all"
  | "offers"
  | "messages"
  | "operations"
  | "ratings"
  | "other";

type ActingNotificationAction = "mark" | "open" | null;

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
    case "IS_TAMAMLANDI":
      return "operations";
    case "RATING_ALDIN":
    case "RATING_BEKLIYOR":
      return "ratings";
    default:
      return "other";
  }
}

function matchesNotificationFilter(
  notification: NotificationListItem,
  filter: NotificationFilter
): boolean {
  if (filter === "all") {
    return true;
  }

  return resolveNotificationFilter(notification.tip) === filter;
}

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

export default function NotificationsPage() {
  const router = useRouter();
  const {
    accessToken,
    hasBusinessAccess,
    isAdmin,
    isCustomerWorkspace,
    primaryRole,
    status,
  } = useDashboardAccess("shared-account");
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingAction, setActingAction] =
    useState<ActingNotificationAction>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<NotificationFilter>("all");

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      try {
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
    notificationId: number,
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

  const handleMarkAsRead = async (notificationId: number) => {
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

  return (
    <DashboardShell
      title="Bildirimler"
      description="Sana gelen sistem olaylari, teklif hareketleri ve hatirlatmalar tek inbox altinda toplanir."
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CustomerMetricCard
            label="Listelenen bildirim"
            value={notifications.length}
            hint="Son 50 kayit icinden"
            tone="blue"
            icon={<i className="pi pi-bell text-lg" />}
          />
          <CustomerMetricCard
            label="Okunmamis"
            value={listedUnreadCount}
            hint="Listede yeni kalan akislari gosterir"
            tone="violet"
            icon={<i className="pi pi-envelope text-lg" />}
          />
          <CustomerMetricCard
            label="Listede okundu"
            value={listedReadCount}
            hint="Goz atilan bildirimler"
            tone="emerald"
            icon={<i className="pi pi-check-circle text-lg" />}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && !isCustomerWorkspace ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
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
      isCustomerWorkspace &&
      notifications.length === 0 ? (
        <div className="mt-6">
          <EmptyStateCard
            eyebrow="Bildirim kutusu"
            title="Henuz bildirim yok"
            description="Teklif, mesaj ve teslimat hareketleri olustukca bildirimin burada listelenecek."
            actionHref="/dashboard/isteklerim"
            actionLabel="Isteklerime git"
          />
        </div>
      ) : null}

      {!isLoading &&
      !errorMessage &&
      !isCustomerWorkspace &&
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

      {!isLoading && !errorMessage && isCustomerWorkspace && notifications.length > 0 ? (
        <div className="mt-6">
          <CustomerSectionSurface
            title="Bildirim merkezi"
            count={filteredNotifications.length}
            description="Baslik, mesaj ve bildirim tipi uzerinden local arama yaparak son kayitlarini yonet."
            action={
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll || unreadCount === 0}
                className="app-button-secondary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isMarkingAll ? "Guncelleniyor..." : "Tumunu okundu say"}
              </button>
            }
          >
            <div className="space-y-4">
              <div className="app-surface-muted rounded-[1.35rem] p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <label className="relative block w-full lg:max-w-md">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                        <i className="pi pi-search text-sm" />
                      </span>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Baslik, mesaj veya bildirim tipi ara"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <CustomerWorkspaceSignalPill
                        tone="slate"
                        label="Son 50 kayit"
                      />
                      {unreadCount > listedUnreadCount ? (
                        <CustomerWorkspaceSignalPill
                          tone="amber"
                          label={`Hesap genelinde ${unreadCount} okunmamis`}
                        />
                      ) : null}
                    </div>
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
              </div>

              {filteredNotifications.length === 0 ? (
                <EmptyStateCard
                  eyebrow="Filtre sonucu"
                  title="Filtreye uyan bildirim bulunamadi"
                  description="Arama metnini veya secili grubu temizleyerek son kayitlarini tekrar gorebilirsin."
                />
              ) : (
                <div className="grid gap-4">
                  {filteredNotifications.map((notification) => (
                    <CustomerNotificationCard
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

      {!isLoading && !errorMessage && !isCustomerWorkspace && notifications.length > 0 ? (
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
