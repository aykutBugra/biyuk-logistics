"use client";

const AUTH_STORAGE_KEY = "nakliye.auth";
const DASHBOARD_WORKSPACE_STORAGE_KEY = "nakliye-dashboard-workspace";
const AUTH_CHANGE_EVENT = "nakliye-auth-change";
let cachedAuthRawValue: string | null | undefined;
let cachedStoredAuth: StoredAuth | null = null;

export const STORED_ROLE_NAMES = {
  MUSTERI: "MUSTERI",
  NAKLIYECI: "NAKLIYECI",
  ADMIN: "ADMIN",
} as const;

export type StoredAuthRoleName =
  (typeof STORED_ROLE_NAMES)[keyof typeof STORED_ROLE_NAMES];

export type StoredBusinessRoleName =
  | typeof STORED_ROLE_NAMES.MUSTERI
  | typeof STORED_ROLE_NAMES.NAKLIYECI;

export type StoredDashboardWorkspaceMode = "customer" | "carrier";
export type StoredDashboardIntroRole = StoredDashboardWorkspaceMode;

export type StoredAuthUser = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  customerIntroDismissedAt: string | null;
  carrierIntroDismissedAt: string | null;
  roles: string[];
  businessRoles?: StoredBusinessRoleName[];
  isAdmin?: boolean;
};

export type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  user?: StoredAuthUser;
};

type AuthChangeCallback = () => void;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isStoredAuth(value: unknown): value is StoredAuth {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredAuth>;

  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    candidate.tokenType === "Bearer"
  );
}

function emitAuthChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getStoredAuth(): StoredAuth | null {
  if (!isBrowser()) {
    return null;
  }

  const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (rawAuth === cachedAuthRawValue) {
    return cachedStoredAuth;
  }

  if (!rawAuth) {
    cachedAuthRawValue = null;
    cachedStoredAuth = null;
    return null;
  }

  try {
    const parsed = JSON.parse(rawAuth) as unknown;
    cachedAuthRawValue = rawAuth;
    cachedStoredAuth = isStoredAuth(parsed) ? parsed : null;
    return cachedStoredAuth;
  } catch {
    cachedAuthRawValue = rawAuth;
    cachedStoredAuth = null;
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth) {
  if (!isBrowser()) {
    return;
  }

  const rawAuth = JSON.stringify(auth);
  window.localStorage.setItem(AUTH_STORAGE_KEY, rawAuth);
  cachedAuthRawValue = rawAuth;
  cachedStoredAuth = auth;
  emitAuthChange();
}

export function mergeStoredAuthUser(user: StoredAuthUser) {
  const auth = getStoredAuth();

  if (!auth) {
    return;
  }

  setStoredAuth({
    ...auth,
    user,
  });
}

export function clearStoredAuth() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(DASHBOARD_WORKSPACE_STORAGE_KEY);
  cachedAuthRawValue = null;
  cachedStoredAuth = null;
  emitAuthChange();
}

export function getAccessToken(): string | null {
  return getStoredAuth()?.accessToken ?? null;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export function storedAuthHasRole(
  auth: StoredAuth | null,
  roleName: StoredAuthRoleName
): boolean {
  return auth?.user?.roles.includes(roleName) ?? false;
}

export function getStoredDashboardWorkspaceMode(): StoredDashboardWorkspaceMode | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(DASHBOARD_WORKSPACE_STORAGE_KEY);

  if (rawValue === "customer" || rawValue === "carrier") {
    return rawValue;
  }

  return null;
}

export function setStoredDashboardWorkspaceMode(
  mode: StoredDashboardWorkspaceMode
) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(DASHBOARD_WORKSPACE_STORAGE_KEY, mode);
  emitAuthChange();
}

export function clearStoredDashboardWorkspaceMode() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(DASHBOARD_WORKSPACE_STORAGE_KEY);
  emitAuthChange();
}

export function getDashboardHrefForWorkspaceMode(
  mode: StoredDashboardWorkspaceMode
): string {
  return mode === "carrier" ? "/dashboard/acik_istekler" : "/dashboard/isteklerim";
}

export function resolveStoredDashboardWorkspaceMode(
  auth: StoredAuth | null
): StoredDashboardWorkspaceMode | null {
  const hasCustomerRole = storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI);
  const hasCarrierRole = storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI);

  if (hasCustomerRole && hasCarrierRole) {
    const preferredMode = getStoredDashboardWorkspaceMode();

    if (preferredMode) {
      return preferredMode;
    }

    return (auth?.user?.carrierIntroDismissedAt ?? null) ? "customer" : "carrier";
  }

  if (hasCarrierRole) {
    return "carrier";
  }

  if (hasCustomerRole) {
    return "customer";
  }

  return null;
}

export function getPendingDashboardIntroRole(
  auth: StoredAuth | null,
  workspaceMode: StoredDashboardWorkspaceMode | null = resolveStoredDashboardWorkspaceMode(
    auth
  )
): StoredDashboardIntroRole | null {
  if (!auth?.user) {
    return null;
  }

  if (
    workspaceMode === "carrier" &&
    storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI) &&
    (auth.user.carrierIntroDismissedAt ?? null) === null
  ) {
    return "carrier";
  }

  if (
    workspaceMode === "customer" &&
    storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI) &&
    (auth.user.customerIntroDismissedAt ?? null) === null
  ) {
    return "customer";
  }

  return null;
}

export function hasDualBusinessRoles(auth: StoredAuth | null): boolean {
  return (
    storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI) &&
    storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI)
  );
}

export function getDashboardHref(auth: StoredAuth | null): string {
  return auth ? "/dashboard" : "/";
}

export function subscribeToAuthChanges(callback: AuthChangeCallback): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const handleCustomEvent = () => {
    callback();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY || event.key === null) {
      callback();
    }
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
