"use client";

const AUTH_STORAGE_KEY = "nakliye.auth";
const DASHBOARD_WORKSPACE_STORAGE_KEY = "nakliye-dashboard-workspace";
const AUTH_CHANGE_EVENT = "nakliye-auth-change";
// localStorage her okumada parse edilmesin diye son ham deger ve parse sonucu cache'lenir.
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
  id: string;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  profileImageUrl?: string;
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

// localStorage disaridan bozulursa uygulama gecersiz auth objesini kullanmaz.
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

// Ayni sekmede auth degisince hook'larin yeniden hesaplanmasi icin custom event yayinlanir.
function emitAuthChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

// Auth bilgisini localStorage'dan okur; browser disinda her zaman null dondurur.
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

// Login/refresh sonrasi token ve kullanici bilgisini saklar.
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

// Profil guncellenince tokenlari bozmadan sadece kullanici snapshot'i yenilenir.
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

// Cikis veya refresh hatasinda auth ve dashboard tercihleri birlikte temizlenir.
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

// Dashboard tarafinda API isteklerine verilecek access token'i kisa yoldan dondurur.
export function getAccessToken(): string | null {
  return getStoredAuth()?.accessToken ?? null;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

// Rol kontrolu UI guard'larinda merkezi olarak kullanilir.
export function storedAuthHasRole(
  auth: StoredAuth | null,
  roleName: StoredAuthRoleName
): boolean {
  return auth?.user?.roles.includes(roleName) ?? false;
}

// Cift role sahip kullanicinin son actigi dashboard tarafini localStorage'dan okur.
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

// Musteri/nakliyeci sekmesi degistiginde tercih saklanir ve layout'a haber verilir.
export function setStoredDashboardWorkspaceMode(
  mode: StoredDashboardWorkspaceMode
) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(DASHBOARD_WORKSPACE_STORAGE_KEY, mode);
  emitAuthChange();
}

// Rol veya hesap degisikliklerinde eski workspace tercihi temizlenir.
export function clearStoredDashboardWorkspaceMode() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(DASHBOARD_WORKSPACE_STORAGE_KEY);
  emitAuthChange();
}

// Workspace moduna gore dashboard icindeki varsayilan hedef sayfa belirlenir.
export function getDashboardHrefForWorkspaceMode(
  mode: StoredDashboardWorkspaceMode
): string {
  return mode === "carrier" ? "/dashboard/acik_istekler" : "/dashboard/isteklerim";
}

// Tek rol veya cift rol durumuna gore dashboard'un hangi tarafinin acilacagini cozer.
export function resolveStoredDashboardWorkspaceMode(
  auth: StoredAuth | null
): StoredDashboardWorkspaceMode | null {
  const hasCustomerRole = storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI);
  const hasCarrierRole = storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI);

  if (hasCustomerRole && hasCarrierRole) {
    const preferredMode = getStoredDashboardWorkspaceMode();

    // Kullanici daha once secim yaptiysa o tercih onceliklidir.
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

// Ilk giriste hangi rol icin tanitim modalinin gosterilecegini hesaplar.
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

// Musteri ve nakliyeci rollerini ayni hesapta tasiyan kullaniciyi ayirt eder.
export function hasDualBusinessRoles(auth: StoredAuth | null): boolean {
  return (
    storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI) &&
    storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI)
  );
}

export function getDashboardHref(auth: StoredAuth | null): string {
  return auth ? "/dashboard" : "/";
}

// Auth degisimleri hem ayni sekmedeki custom event'ten hem diger sekmelerdeki storage event'ten izlenir.
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
