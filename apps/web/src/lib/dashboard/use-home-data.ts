"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyCarrierRoutes,
  type CarrierRouteListItem,
} from "@/lib/api/carrier-routes";
import { getMyJobs, type JobListItem } from "@/lib/api/jobs";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  type NotificationListItem,
} from "@/lib/api/notifications";
import {
  getMyOfferThreads,
  type OfferThreadSummary,
} from "@/lib/api/offer-threads";
import {
  getMyIncomingOffers,
  getMyOffers,
  getOpenOfferRequests,
  type MyIncomingOfferItem,
  type OfferItem,
  type OpenOfferRequestListItem,
} from "@/lib/api/offers";
import {
  getMyTransportRequests,
  type TransportRequestListItem,
} from "@/lib/api/transport-requests";
import { getMyVehicles, type VehicleListItem } from "@/lib/api/vehicles";
import {
  clearStoredAuth,
  type StoredAuth,
  type StoredDashboardIntroRole,
} from "@/lib/auth/auth-storage";

export type CustomerHomeData = {
  requestCount: number;
  activeRequestCount: number;
  agreedRequestCount: number;
  openRequestCount: number;
  completedRequestCount: number;
  incomingOfferCount: number;
  pendingIncomingOfferCount: number;
  unreadConversationCount: number;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  requests: TransportRequestListItem[];
  incomingOffers: MyIncomingOfferItem[];
  threads: OfferThreadSummary[];
};

export type CarrierDashboardActivity = {
  id: string;
  title: string;
  description: string;
  timestamp: string | null;
  href: string | null;
  tone: "blue" | "emerald" | "amber" | "slate";
  badge?: string;
};

export type CarrierRoutePreview = {
  route: CarrierRouteListItem;
  suitableCount: number;
  averageDeviationKm: number | null;
  maxSapmaKm: number;
};

export type CarrierHomeData = {
  offerCount: number;
  openOfferCount: number;
  acceptedOfferCount: number;
  shipmentCount: number;
  activeShipmentCount: number;
  completedShipmentCount: number;
  routeCount: number;
  vehicleCount: number;
  suitableOpenRequestCount: number;
  unreadConversationCount: number;
  unreadNotificationCount: number;
  featuredRequest: OpenOfferRequestListItem | null;
  routePreview: CarrierRoutePreview | null;
  vehiclePreview: VehicleListItem | null;
  recentActivities: CarrierDashboardActivity[];
  offers: OfferItem[];
  jobs: JobListItem[];
  routes: CarrierRouteListItem[];
  vehicles: VehicleListItem[];
  threads: OfferThreadSummary[];
  notifications: NotificationListItem[];
};

export type SharedHomeData = {
  unreadConversationCount: number;
  unreadNotificationCount: number;
};

export type DashboardHomeState = {
  isLoading: boolean;
  errorMessage: string | null;
  customer: CustomerHomeData | null;
  carrier: CarrierHomeData | null;
  shared: SharedHomeData | null;
};

type UseHomeDataParams = {
  auth: StoredAuth | null | undefined;
  hasCustomerRole: boolean;
  hasCarrierRole: boolean;
  hasBusinessAccess: boolean;
  pendingIntroRole: StoredDashboardIntroRole | null;
};

const DEFAULT_DASHBOARD_MAX_SAPMA_KM = 50;

// Backend status degerleri farkli casing ile gelirse hesaplar bozulmasin diye normalize edilir.
function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function isOpenRequestStatus(status: string): boolean {
  return normalizeStatus(status) === "OLUSTURULDU";
}

function isAgreedRequestStatus(status: string): boolean {
  return normalizeStatus(status) === "ANLASILDI";
}

function isCompletedRequestStatus(status: string): boolean {
  return normalizeStatus(status) === "TAMAMLANDI";
}

function isActiveJobStatus(status: string): boolean {
  const normalizedStatus = normalizeStatus(status);
  return (
    normalizedStatus === "OLUSTURULDU" ||
    normalizedStatus === "BASLATILDI" ||
    normalizedStatus === "TESLIM_BEKLIYOR"
  );
}

function isCompletedJobStatus(status: string): boolean {
  return normalizeStatus(status) === "TAMAMLANDI";
}

function createInitialHomeState(): DashboardHomeState {
  return {
    isLoading: true,
    errorMessage: null,
    customer: null,
    carrier: null,
    shared: null,
  };
}

// Nakliyeci tarafinda rota onerisi icin en son eklenen rota varsayilan secilir.
function selectPrimaryRoute(routes: CarrierRouteListItem[]): CarrierRouteListItem | null {
  return (
    [...routes].sort(
      (left, right) =>
        new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime()
    )[0] ?? null
  );
}

// Rota uyumu uygun olan istekler once, sinirdakiler sonra siralanir.
function getRouteMatchRank(request: OpenOfferRequestListItem): number {
  const label = request.rotaUyumu?.uygunlukEtiketi?.trim().toUpperCase();

  if (label === "UYGUN") {
    return 0;
  }

  if (label === "SINIRDA") {
    return 1;
  }

  return 2;
}

// Ana ekranda tek firsat gosterilecegi icin en iyi rota uyumu ve en yeni kayit oncelenir.
function selectFeaturedRequest(
  requests: OpenOfferRequestListItem[]
): OpenOfferRequestListItem | null {
  return (
    [...requests].sort((left, right) => {
      if (left.alreadyOffered !== right.alreadyOffered) {
        return left.alreadyOffered ? 1 : -1;
      }

      const matchRankDifference = getRouteMatchRank(left) - getRouteMatchRank(right);
      if (matchRankDifference !== 0) {
        return matchRankDifference;
      }

      const deviationDifference =
        (left.rotaUyumu?.extraMesafeMetre ?? Number.MAX_SAFE_INTEGER) -
        (right.rotaUyumu?.extraMesafeMetre ?? Number.MAX_SAFE_INTEGER);
      if (deviationDifference !== 0) {
        return deviationDifference;
      }

      return (
        new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime()
      );
    })[0] ?? null
  );
}

// Secili rota icin acik istek sayisi ve ortalama sapma bilgisi ozetlenir.
function buildRoutePreview(
  route: CarrierRouteListItem | null,
  requests: OpenOfferRequestListItem[]
): CarrierRoutePreview | null {
  if (!route) {
    return null;
  }

  const deviations = requests
    .map((request) => request.rotaUyumu?.extraMesafeMetre ?? null)
    .filter((value): value is number => value !== null);
  const averageDeviationKm =
    deviations.length > 0
      ? deviations.reduce((total, value) => total + value, 0) / deviations.length / 1000
      : null;

  return {
    route,
    suitableCount: requests.length,
    averageDeviationKm,
    maxSapmaKm: DEFAULT_DASHBOARD_MAX_SAPMA_KM,
  };
}

// Bildirim tipinden dashboard aktivite rengini turetir.
function resolveNotificationTone(tip: string): CarrierDashboardActivity["tone"] {
  const normalizedTip = normalizeStatus(tip);

  if (normalizedTip.includes("TEKLIF")) {
    return "emerald";
  }

  if (normalizedTip.includes("MESAJ") || normalizedTip.includes("KONUSMA")) {
    return "blue";
  }

  if (normalizedTip.includes("PUAN") || normalizedTip.includes("RATING")) {
    return "amber";
  }

  return "slate";
}

// Nakliyeci ana ekranindaki son hareket listesi bildirim, konusma, is ve rota verilerinden olusur.
function buildRecentActivities(params: {
  notifications: NotificationListItem[];
  threads: OfferThreadSummary[];
  jobs: JobListItem[];
  routes: CarrierRouteListItem[];
}): CarrierDashboardActivity[] {
  const { notifications, threads, jobs, routes } = params;

  if (notifications.length > 0) {
    return notifications.slice(0, 3).map((notification) => ({
      id: `notification-${notification.id}`,
      title: notification.baslik,
      description: notification.mesaj,
      timestamp: notification.olusturmaTarihi,
      href: notification.hedefUrl,
      tone: resolveNotificationTone(notification.tip),
      badge: notification.isRead ? undefined : "Yeni",
    }));
  }

  if (threads.length > 0) {
    return [...threads]
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt ?? right.closedAt ?? 0).getTime() -
          new Date(left.lastMessageAt ?? left.closedAt ?? 0).getTime()
      )
      .slice(0, 3)
      .map((thread) => ({
        id: `thread-${thread.id}`,
        title: thread.karsiTarafAdSoyad,
        description: thread.lastMessageSummary ?? "Konusma hareketi var.",
        timestamp: thread.lastMessageAt ?? thread.closedAt,
        href: `/dashboard/konusmalar/teklif/${thread.offerId}`,
        tone: thread.hasUnread ? "blue" : "slate",
        badge: thread.hasUnread ? "Okunmamis" : undefined,
      }));
  }

  if (jobs.length > 0) {
    return [...jobs]
      .sort(
        (left, right) =>
          new Date(right.teslimTarihi ?? right.baslangicTarihi ?? right.olusturmaTarihi).getTime() -
          new Date(left.teslimTarihi ?? left.baslangicTarihi ?? left.olusturmaTarihi).getTime()
      )
      .slice(0, 3)
      .map((job) => ({
        id: `job-${job.id}`,
        title: `${job.baslangicSehri} -> ${job.varisSehri}`,
        description: `${job.counterpartyName} ile nakliye akisi aktif.`,
        timestamp: job.teslimTarihi ?? job.baslangicTarihi ?? job.olusturmaTarihi,
        href: `/dashboard/nakliyelerim/${job.id}`,
        tone: isCompletedJobStatus(job.durum) ? "emerald" : "blue",
        badge: isCompletedJobStatus(job.durum) ? "Tamamlandi" : "Aktif",
      }));
  }

  if (routes.length > 0) {
    return [...routes]
      .sort(
        (left, right) =>
          new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime()
      )
      .slice(0, 3)
      .map((route) => ({
        id: `route-${route.id}`,
        title: `${route.baslangicSehri} -> ${route.varisSehri}`,
        description: "Rota kaydin kesif icin hazir.",
        timestamp: route.olusturmaTarihi,
        href: `/dashboard/rotalarim/${route.id}`,
        tone: "slate",
        badge: "Rota",
      }));
  }

  return [];
}

// Dashboard ana ekraninin musteri, nakliyeci ve ortak sayaclarini tek hook icinde toplar.
export function useHomeData({
  auth,
  hasCustomerRole,
  hasCarrierRole,
  hasBusinessAccess,
  pendingIntroRole,
}: UseHomeDataParams): DashboardHomeState {
  const router = useRouter();
  const [homeState, setHomeState] = useState<DashboardHomeState>(createInitialHomeState);

  useEffect(() => {
    // Auth henuz bilinmiyorsa veya intro aciksa veri cekme ertelenir.
    if (auth === undefined) {
      return;
    }

    if (!auth?.accessToken || !hasBusinessAccess || pendingIntroRole) {
      return;
    }

    let isMounted = true;

    const loadHome = async () => {
      try {
        setHomeState((state) => ({ ...state, isLoading: true, errorMessage: null }));

        // Ortak sayac her rolde lazim, role ozel veri ise sadece kullanicinin yetkisi varsa cekilir.
        const unreadNotificationsPromise = getMyUnreadNotificationCount(auth.accessToken);
        const customerPromise = hasCustomerRole
          ? Promise.all([
              getMyTransportRequests(auth.accessToken),
              getMyIncomingOffers(auth.accessToken),
              getMyOfferThreads(auth.accessToken, { as: "customer" }),
            ])
          : Promise.resolve(null);
        const carrierPromise = hasCarrierRole
          ? (async () => {
              const [offers, jobs, routes, vehicles, threads, notifications] = await Promise.all([
                getMyOffers(auth.accessToken),
                getMyJobs(auth.accessToken, "carrier"),
                getMyCarrierRoutes(auth.accessToken),
                getMyVehicles(auth.accessToken),
                getMyOfferThreads(auth.accessToken, { as: "carrier" }),
                getMyNotifications(auth.accessToken).catch(
                  () => [] as NotificationListItem[]
                ),
              ]);

              const primaryRoute = selectPrimaryRoute(routes);
              // Rota varsa acik istekler bu rota ve varsayilan sapma limitiyle daraltilir.
              const suitableRequests = primaryRoute
                ? await getOpenOfferRequests(auth.accessToken, {
                    carrierRouteId: primaryRoute.id,
                    maxSapmaKm: DEFAULT_DASHBOARD_MAX_SAPMA_KM,
                  }).catch(() => [] as OpenOfferRequestListItem[])
                : [];

              return {
                offers,
                jobs,
                routes,
                vehicles,
                threads,
                notifications,
                primaryRoute,
                suitableRequests,
              };
            })()
          : Promise.resolve(null);

        const [customerResponse, carrierResponse, unreadNotifications] = await Promise.all([
          customerPromise,
          carrierPromise,
          unreadNotificationsPromise,
        ]);

        if (!isMounted) {
          return;
        }

        // Musteri icin talep, teklif ve okunmamis konusma sayaclari tek view modele cevrilir.
        const customerData: CustomerHomeData | null = customerResponse
          ? (() => {
              const [requests, incomingOffers, threads] = customerResponse;
              const openRequestCount = requests.filter((request) =>
                isOpenRequestStatus(request.durum)
              ).length;
              const agreedRequestCount = requests.filter((request) =>
                isAgreedRequestStatus(request.durum)
              ).length;
              const completedRequestCount = requests.filter((request) =>
                isCompletedRequestStatus(request.durum)
              ).length;
              const pendingIncomingOfferCount = incomingOffers.filter(
                (offer) => normalizeStatus(offer.durum) === "OLUSTURULDU"
              ).length;
              const unreadConversationCount = threads.filter((thread) => thread.hasUnread).length;
              const unreadMessageCount = threads.reduce(
                (total, thread) => total + thread.unreadCount,
                0
              );

              return {
                requestCount: requests.length,
                activeRequestCount: openRequestCount,
                agreedRequestCount,
                openRequestCount,
                completedRequestCount,
                incomingOfferCount: incomingOffers.length,
                pendingIncomingOfferCount,
                unreadConversationCount,
                unreadMessageCount,
                unreadNotificationCount: unreadNotifications.unreadCount,
                requests,
                incomingOffers,
                threads,
              };
            })()
          : null;

        // Nakliyeci icin teklif, nakliye, rota, arac ve kesif verisi ayni dashboard modelinde birlesir.
        const carrierData: CarrierHomeData | null = carrierResponse
          ? (() => {
              const {
                offers,
                jobs,
                routes,
                vehicles,
                threads,
                notifications,
                primaryRoute,
                suitableRequests,
              } = carrierResponse;
              const activeShipmentCount = jobs.filter((job) =>
                isActiveJobStatus(job.durum)
              ).length;
              const completedShipmentCount = jobs.filter((job) =>
                isCompletedJobStatus(job.durum)
              ).length;
              const openOfferCount = offers.filter(
                (offer) => normalizeStatus(offer.durum) === "OLUSTURULDU"
              ).length;
              const acceptedOfferCount = offers.filter(
                (offer) => normalizeStatus(offer.durum) === "KABUL_EDILDI"
              ).length;

              return {
                offerCount: offers.length,
                openOfferCount,
                acceptedOfferCount,
                shipmentCount: jobs.length,
                activeShipmentCount,
                completedShipmentCount,
                routeCount: routes.length,
                vehicleCount: vehicles.length,
                suitableOpenRequestCount: suitableRequests.length,
                unreadConversationCount: threads.filter((thread) => thread.hasUnread).length,
                unreadNotificationCount: unreadNotifications.unreadCount,
                featuredRequest: selectFeaturedRequest(suitableRequests),
                routePreview: buildRoutePreview(primaryRoute, suitableRequests),
                vehiclePreview: vehicles[0] ?? null,
                recentActivities: buildRecentActivities({
                  notifications,
                  threads,
                  jobs,
                  routes,
                }),
                offers,
                jobs,
                routes,
                vehicles,
                threads,
                notifications,
              };
            })()
          : null;

        setHomeState({
          isLoading: false,
          errorMessage: null,
          customer: customerData,
          carrier: carrierData,
          shared: {
            unreadConversationCount:
              (customerData?.unreadConversationCount ?? 0) +
              (carrierData?.unreadConversationCount ?? 0),
            unreadNotificationCount: unreadNotifications.unreadCount,
          },
        });
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

        setHomeState({
          isLoading: false,
          errorMessage:
            error instanceof ApiClientError
              ? error.message
              : "Genel bakis yuklenirken beklenmeyen bir hata olustu.",
          customer: null,
          carrier: null,
          shared: null,
        });
      }
    };

    void loadHome();

    return () => {
      isMounted = false;
    };
  }, [auth, hasBusinessAccess, hasCarrierRole, hasCustomerRole, pendingIntroRole, router]);

  return homeState;
}
