"use client";

import type { ReactNode } from "react";
import { useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardShellFrame from "@/components/DashboardShellFrame";
import {
  getStoredAuth,
  hasDualBusinessRoles,
  resolveStoredDashboardWorkspaceMode,
  setStoredDashboardWorkspaceMode,
  storedAuthHasRole,
  subscribeToAuthChanges,
  STORED_ROLE_NAMES,
  type StoredAuth,
  type StoredDashboardWorkspaceMode,
} from "@/lib/auth/auth-storage";
import {
  buildDashboardNavigation,
  type DashboardNavVisibility,
} from "@/lib/dashboard/navigation";

type DashboardShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  pageEyebrow?: string;
  workspaceHint?: StoredDashboardWorkspaceMode;
  headerActions?: ReactNode;
  pageHeader?: ReactNode;
  visualTheme?: "customer-overview" | "petrol";
  unreadNotificationCount?: number;
  headerVariant?: "default" | "compact";
  sidebarVariant?: "default" | "icon-rail";
  motionPreset?: "default" | "operational" | "form";
  cardMotionLimit?: number;
};

type DashboardSidebarBehaviorScope = "home" | "child" | "other";

const PREMIUM_WORKSPACE_PATHS = new Set([
  "/dashboard/isteklerim", "/dashboard/gelen_teklifler", "/dashboard/konusmalar",
  "/dashboard/puanlarim", "/dashboard/bildirimler", "/dashboard/profil", "/dashboard/istek_ekle",
  "/dashboard/acik_istekler", "/dashboard/tekliflerim", "/dashboard/nakliyelerim",
  "/dashboard/rotalarim", "/dashboard/araclarim", "/dashboard/arac_ekle",
]);

function normalizePathname(pathname: string): string {
  return pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function resolveSidebarVariant(
  pathname: string,
  sidebarVariant?: DashboardShellProps["sidebarVariant"]
): "default" | "icon-rail" {
  if (sidebarVariant) {
    return sidebarVariant;
  }

  const normalizedPathname = normalizePathname(pathname);

  if (
    normalizedPathname === "/dashboard" ||
    normalizedPathname.startsWith("/dashboard/")
  ) {
    return "icon-rail";
  }

  return "default";
}

function resolveSidebarBehaviorScope(pathname: string): DashboardSidebarBehaviorScope {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/dashboard") {
    return "home";
  }

  if (normalizedPathname.startsWith("/dashboard/")) {
    return "child";
  }

  return "other";
}

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

function canStayOnPath(visibility: DashboardNavVisibility | null): boolean {
  return (
    visibility === "shared-business" ||
    visibility === "shared-account" ||
    visibility === "admin" ||
    visibility === null
  );
}

export default function DashboardShell({
  title,
  description,
  children,
  pageEyebrow,
  workspaceHint,
  headerActions,
  pageHeader,
  visualTheme,
  unreadNotificationCount,
  headerVariant,
  sidebarVariant,
  motionPreset = "default",
  cardMotionLimit,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );

  const isCustomer = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.MUSTERI);
  const isCarrier = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.NAKLIYECI);
  const isAdmin = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.ADMIN);
  const dualBusinessRoles = hasDualBusinessRoles(auth ?? null);
  const resolvedWorkspaceMode = resolveStoredDashboardWorkspaceMode(auth ?? null);
  const workspaceMode = workspaceHint ?? resolvedWorkspaceMode;
  const resolvedSidebarVariant = resolveSidebarVariant(pathname, sidebarVariant);
  const sidebarBehaviorScope = resolveSidebarBehaviorScope(pathname);

  const navigationModel = useMemo(
    () =>
      buildDashboardNavigation({
        isCustomer,
        isCarrier,
        isAdmin,
        workspaceMode,
        pathname,
      }),
    [isAdmin, isCarrier, isCustomer, pathname, workspaceMode]
  );

  const activeVisibility = useMemo(() => {
    const activeEntry = navigationModel.activeItem;

    if (!activeEntry) {
      return null;
    }

    if (activeEntry.id.startsWith("customer-")) {
      return "customer" as const;
    }

    if (activeEntry.id.startsWith("carrier-")) {
      return "carrier" as const;
    }

    if (activeEntry.id.startsWith("shared-")) {
      return "shared-business" as const;
    }

    if (activeEntry.id.startsWith("account-")) {
      return "shared-account" as const;
    }

    if (activeEntry.id.startsWith("admin-")) {
      return "admin" as const;
    }

    return null;
  }, [navigationModel.activeItem]);

  const handleWorkspaceChange = (mode: StoredDashboardWorkspaceMode) => {
    setStoredDashboardWorkspaceMode(mode);

    const nextPath = canStayOnPath(activeVisibility) ? pathname : "/dashboard";
    router.replace(nextPath);
  };

  return (
    <DashboardShellFrame
      auth={auth}
      panelEyebrow={navigationModel.shellMeta.panelEyebrow}
      panelTitle={navigationModel.shellMeta.panelTitle}
      panelDescription={navigationModel.shellMeta.panelDescription}
      navGroups={navigationModel.navGroups}
      workspaceMode={workspaceMode ?? null}
      dualBusinessRoles={dualBusinessRoles}
      onWorkspaceChange={handleWorkspaceChange}
      pathname={pathname}
      title={title}
      description={description}
      pageEyebrow={pageEyebrow}
      headerActions={headerActions}
      pageHeader={pageHeader}
      visualTheme={visualTheme ?? ([...PREMIUM_WORKSPACE_PATHS].some((base) => normalizePathname(pathname) === base || normalizePathname(pathname).startsWith(base + "/")) ? "petrol" : undefined)}
      unreadNotificationCount={unreadNotificationCount}
      headerVariant={headerVariant}
      sidebarVariant={resolvedSidebarVariant}
      sidebarBehaviorScope={sidebarBehaviorScope}
      motionPreset={motionPreset}
      cardMotionLimit={cardMotionLimit}
    >
      {children}
    </DashboardShellFrame>
  );
}
