"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  STORED_ROLE_NAMES,
  getStoredAuth,
  setStoredDashboardWorkspaceMode,
  storedAuthHasRole,
  subscribeToAuthChanges,
  type StoredAuth,
} from "./auth-storage";

export type CustomerPageAccessStatus = "checking" | "ready" | "redirecting";

type CustomerPageAccess = {
  accessToken: string | null;
  status: CustomerPageAccessStatus;
};

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

export function useCustomerPageAccess(): CustomerPageAccess {
  const router = useRouter();
  const auth = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );

  useEffect(() => {
    if (auth === undefined) {
      return;
    }

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI)) {
      router.replace("/");
      return;
    }

    setStoredDashboardWorkspaceMode("customer");
  }, [auth, router]);

  if (auth === undefined) {
    return {
      accessToken: null,
      status: "checking",
    };
  }

  if (!auth || !storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI)) {
    return {
      accessToken: null,
      status: "redirecting",
    };
  }

  return {
    accessToken: auth.accessToken,
    status: "ready",
  };
}
