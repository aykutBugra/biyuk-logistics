"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyCarrierRoutes } from "@/lib/api/carrier-routes";
import { getMyJobs } from "@/lib/api/jobs";
import { getMyUnreadNotificationCount } from "@/lib/api/notifications";
import { getMyOfferThreads } from "@/lib/api/offer-threads";
import { getMyIncomingOffers, getMyOffers } from "@/lib/api/offers";
import { getMyTransportRequests } from "@/lib/api/transport-requests";
import { getMyVehicles } from "@/lib/api/vehicles";
import {
  clearStoredAuth,
  type StoredAuth,
  type StoredDashboardIntroRole,
} from "@/lib/auth/auth-storage";

export type CustomerHomeData = {
  requestCount: number;
  activeRequestCount: number;
  agreedRequestCount: number;
  incomingOfferCount: number;
  unreadConversationCount: number;
  unreadNotificationCount: number;
};

export type CarrierHomeData = {
  offerCount: number;
  openOfferCount: number;
  shipmentCount: number;
  activeShipmentCount: number;
  routeCount: number;
  vehicleCount: number;
  unreadConversationCount: number;
  unreadNotificationCount: number;
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

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
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
    if (auth === undefined) {
      return;
    }

    if (!auth?.accessToken || !hasBusinessAccess || pendingIntroRole) {
      return;
    }

    let isMounted = true;

    const loadHome = async () => {
      try {
        setHomeState((s) => ({ ...s, isLoading: true, errorMessage: null }));

        const unreadNotificationsPromise = getMyUnreadNotificationCount(auth.accessToken);
        const customerPromise = hasCustomerRole
          ? Promise.all([
              getMyTransportRequests(auth.accessToken),
              getMyIncomingOffers(auth.accessToken),
              getMyOfferThreads(auth.accessToken, { as: "customer" }),
            ])
          : Promise.resolve(null);
        const carrierPromise = hasCarrierRole
          ? Promise.all([
              getMyOffers(auth.accessToken),
              getMyJobs(auth.accessToken, "carrier"),
              getMyCarrierRoutes(auth.accessToken),
              getMyVehicles(auth.accessToken),
              getMyOfferThreads(auth.accessToken, { as: "carrier" }),
            ])
          : Promise.resolve(null);

        const [customerResponse, carrierResponse, unreadNotifications] =
          await Promise.all([customerPromise, carrierPromise, unreadNotificationsPromise]);

        if (!isMounted) return;

        const customerData: CustomerHomeData | null = customerResponse
          ? (() => {
              const [requests, incomingOffers, threads] = customerResponse;
              const agreedRequestCount = requests.filter((r) => {
                const s = normalizeStatus(r.durum);
                return s === "ANLASILDI" || s === "TAMAMLANDI";
              }).length;
              return {
                requestCount: requests.length,
                activeRequestCount: requests.length - agreedRequestCount,
                agreedRequestCount,
                incomingOfferCount: incomingOffers.length,
                unreadConversationCount: threads.filter((t) => t.hasUnread).length,
                unreadNotificationCount: unreadNotifications.unreadCount,
              };
            })()
          : null;

        const carrierData: CarrierHomeData | null = carrierResponse
          ? (() => {
              const [offers, jobs, routes, vehicles, threads] = carrierResponse;
              const activeShipmentCount = jobs.filter((j) => {
                const s = normalizeStatus(j.durum);
                return s === "OLUSTURULDU" || s === "BASLATILDI";
              }).length;
              return {
                offerCount: offers.length,
                openOfferCount: offers.filter(
                  (o) => normalizeStatus(o.durum) === "OLUSTURULDU"
                ).length,
                shipmentCount: jobs.length,
                activeShipmentCount,
                routeCount: routes.length,
                vehicleCount: vehicles.length,
                unreadConversationCount: threads.filter((t) => t.hasUnread).length,
                unreadNotificationCount: unreadNotifications.unreadCount,
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
        if (!isMounted) return;

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
              : "Genel bakış yüklenirken beklenmeyen bir hata oluştu.",
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
