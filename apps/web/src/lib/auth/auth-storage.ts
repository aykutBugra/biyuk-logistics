"use client";

const AUTH_STORAGE_KEY = "nakliye.auth";
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

export type StoredAuthUser = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  roles: string[];
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

export function clearStoredAuth() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
