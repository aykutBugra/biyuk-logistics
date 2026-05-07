"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  STORED_ROLE_NAMES,
  getStoredAuth,
  hasDualBusinessRoles,
  resolveStoredDashboardWorkspaceMode,
  storedAuthHasRole,
  subscribeToAuthChanges,
  type StoredDashboardWorkspaceMode,
  type StoredAuth,
} from "./auth-storage";

export type DashboardAccessStatus = "checking" | "ready" | "redirecting";
export type DashboardAccessSurface = "shared-business" | "shared-account" | "admin";

type DashboardAccess = {
  accessToken: string | null;
  status: DashboardAccessStatus;
  auth: StoredAuth | null;
  isCustomer: boolean;
  isCarrier: boolean;
  isAdmin: boolean;
  hasBusinessAccess: boolean;
  hasDualBusinessRoles: boolean;
  workspaceMode: StoredDashboardWorkspaceMode | null;
  isCustomerWorkspace: boolean;
  isCarrierWorkspace: boolean;
  primaryRole: "MUSTERI" | "NAKLIYECI" | null;
};

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

export function useDashboardAccess(
  surface: DashboardAccessSurface = "shared-business"
): DashboardAccess {
  const router = useRouter();
  const auth = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );

  const isCustomer = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.MUSTERI);
  const isCarrier = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.NAKLIYECI);
  const isAdmin = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.ADMIN);
  const hasBusinessAccess = isCustomer || isCarrier;
  const dualBusinessRoleAccess = hasDualBusinessRoles(auth ?? null);
  const workspaceMode = resolveStoredDashboardWorkspaceMode(auth ?? null);

  const hasSurfaceAccess =
    surface === "admin"
      ? isAdmin
      : surface === "shared-account"
        ? hasBusinessAccess || isAdmin
        : hasBusinessAccess;

  useEffect(() => {
    if (auth === undefined) {
      return;
    }

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!hasSurfaceAccess) {
      if (surface === "admin" && hasBusinessAccess) {
        router.replace("/dashboard");
        return;
      }

      if (surface !== "admin" && isAdmin) {
        router.replace("/dashboard/admin");
        return;
      }

      router.replace("/");
      return;
    }

  }, [auth, hasBusinessAccess, hasSurfaceAccess, isAdmin, router, surface]);

  if (auth === undefined) {
    return {
      accessToken: null,
      status: "checking",
      auth: null,
      isCustomer: false,
      isCarrier: false,
      isAdmin: false,
      hasBusinessAccess: false,
      hasDualBusinessRoles: false,
      workspaceMode: null,
      isCustomerWorkspace: false,
      isCarrierWorkspace: false,
      primaryRole: null,
    };
  }

  if (!auth) {
    return {
      accessToken: null,
      status: "redirecting",
      auth: null,
      isCustomer: false,
      isCarrier: false,
      isAdmin: false,
      hasBusinessAccess: false,
      hasDualBusinessRoles: false,
      workspaceMode,
      isCustomerWorkspace: false,
      isCarrierWorkspace: false,
      primaryRole: null,
    };
  }

  if (!hasSurfaceAccess) {
    return {
      accessToken: null,
      status: "redirecting",
      auth: null,
      isCustomer: false,
      isCarrier: false,
      isAdmin: false,
      hasBusinessAccess: false,
      hasDualBusinessRoles: false,
      workspaceMode: null,
      isCustomerWorkspace: false,
      isCarrierWorkspace: false,
      primaryRole: null,
    };
  }

  const primaryRole =
    workspaceMode === "carrier"
      ? "NAKLIYECI"
      : workspaceMode === "customer"
        ? "MUSTERI"
        : isCarrier
          ? "NAKLIYECI"
          : isCustomer
            ? "MUSTERI"
            : null;

  return {
    accessToken: auth.accessToken,
    status: "ready",
    auth,
    isCustomer,
    isCarrier,
    isAdmin,
    hasBusinessAccess,
    hasDualBusinessRoles: dualBusinessRoleAccess,
    workspaceMode,
    isCustomerWorkspace: primaryRole === "MUSTERI",
    isCarrierWorkspace: primaryRole === "NAKLIYECI",
    primaryRole,
  };
}
