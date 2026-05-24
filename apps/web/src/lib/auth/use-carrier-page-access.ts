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

export type CarrierPageAccessStatus = "checking" | "ready" | "redirecting";

type CarrierPageAccess = {
  accessToken: string | null;
  status: CarrierPageAccessStatus;
};

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

// Sadece nakliyeci sayfalarinda kullanilir; yetki yoksa uygun yere yonlendirir.
export function useCarrierPageAccess(): CarrierPageAccess {
  const router = useRouter();
  const auth = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );

  useEffect(() => {
    // Auth snapshot gelmeden redirect calistirmamak hydration farklarini onler.
    if (auth === undefined) {
      return;
    }

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI)) {
      router.replace("/");
      return;
    }

    // Bu guard'in gectigi sayfalarda aktif dashboard modu nakliyeci olarak sabitlenir.
    setStoredDashboardWorkspaceMode("carrier");
  }, [auth, router]);

  if (auth === undefined) {
    return {
      accessToken: null,
      status: "checking",
    };
  }

  if (!auth || !storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI)) {
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
