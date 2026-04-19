"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  STORED_ROLE_NAMES,
  getStoredAuth,
  storedAuthHasRole,
  subscribeToAuthChanges,
  type StoredAuth,
} from "./auth-storage";

export type DashboardAccessStatus = "checking" | "ready" | "redirecting";

type DashboardAccess = {
  accessToken: string | null;
  status: DashboardAccessStatus;
  auth: StoredAuth | null;
  isCustomer: boolean;
  isCarrier: boolean;
  primaryRole: "MUSTERI" | "NAKLIYECI" | null;
};

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

export function useDashboardAccess(): DashboardAccess {
  const router = useRouter();
  const auth = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );

  const isCustomer = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.MUSTERI);
  const isCarrier = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.NAKLIYECI);

  useEffect(() => {
    if (auth === undefined) {
      return;
    }

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!isCustomer && !isCarrier) {
      router.replace("/");
    }
  }, [auth, isCarrier, isCustomer, router]);

  if (auth === undefined) {
    return {
      accessToken: null,
      status: "checking",
      auth: null,
      isCustomer: false,
      isCarrier: false,
      primaryRole: null,
    };
  }

  if (!auth || (!isCustomer && !isCarrier)) {
    return {
      accessToken: null,
      status: "redirecting",
      auth: null,
      isCustomer: false,
      isCarrier: false,
      primaryRole: null,
    };
  }

  return {
    accessToken: auth.accessToken,
    status: "ready",
    auth,
    isCustomer,
    isCarrier,
    primaryRole: isCarrier ? "NAKLIYECI" : "MUSTERI",
  };
}
