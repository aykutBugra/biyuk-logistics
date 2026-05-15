"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import MotionCollapse from "@/components/MotionCollapse";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyUnreadNotificationCount } from "@/lib/api/notifications";
import {
  clearStoredAuth,
  getDashboardHref,
  getStoredAuth,
  subscribeToAuthChanges,
  type StoredAuth,
} from "@/lib/auth/auth-storage";
import { subscribeToNotificationChanges } from "@/lib/notifications/notification-events";

function getAuthLabel(auth: StoredAuth | null): string {
  if (!auth?.user) {
    return "Merhaba";
  }

  return auth.user.kullaniciAdi || auth.user.ad || "Merhaba";
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const syncAuth = () => {
      setAuth(getStoredAuth());
      setIsReady(true);
    };

    syncAuth();

    return subscribeToAuthChanges(syncAuth);
  }, []);

  const dashboardHref = useMemo(() => getDashboardHref(auth), [auth]);
  const notificationsHref = "/dashboard/bildirimler";
  const displayedUnreadNotificationCount = auth ? unreadNotificationCount : 0;
  const hasUnreadNotifications = displayedUnreadNotificationCount > 0;

  useEffect(() => {
    if (!isReady || !auth?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadUnreadCount = async () => {
      try {
        const response = await getMyUnreadNotificationCount(auth.accessToken);

        if (!isMounted) {
          return;
        }

        setUnreadNotificationCount(response.unreadCount);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          return;
        }

        setUnreadNotificationCount(0);
      }
    };

    void loadUnreadCount();

    const unsubscribeNotifications = subscribeToNotificationChanges(() => {
      void loadUnreadCount();
    });

    return () => {
      isMounted = false;
      unsubscribeNotifications();
    };
  }, [auth, isReady, pathname]);

  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  const publicLinks = [
    { href: "/", label: "Ana Sayfa" },
    { href: "/hakkimizda", label: "Hakkimizda" },
    { href: "/iletisim", label: "Iletisim" },
  ];

  const handleLogout = () => {
    setIsMobileOpen(false);
    clearStoredAuth();
    router.replace("/");
  };

  const handleMobileNavigate = () => {
    setIsMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[var(--topbar-height)] items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-3 text-slate-950 transition hover:opacity-90"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">
                B
              </span>
              <span className="text-2xl font-black tracking-tight">
                Bi<span className="text-blue-600">'</span>yuk
              </span>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              {publicLinks.map((link) => {
                const active = isActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {!isReady ? (
              <div className="h-10 w-56" aria-hidden />
            ) : auth ? (
              <>
                <Link
                  href={notificationsHref}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    isActive(pathname, notificationsHref)
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  <span>Bildirimler</span>
                  {hasUnreadNotifications ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                      {displayedUnreadNotificationCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href={dashboardHref}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    pathname.startsWith("/dashboard")
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  Panelim
                </Link>
                <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-600">
                  <CustomerInitialsAvatar
                    name={`${auth.user?.ad ?? ""} ${auth.user?.soyad ?? ""}`}
                    fallback={auth.user?.kullaniciAdi ?? "NA"}
                    imageUrl={auth.user?.profileImageUrl}
                    size="sm"
                    tone="blue"
                  />
                  Merhaba, {getAuthLabel(auth)}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-transparent px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-white hover:text-slate-950"
                >
                  Cikis Yap
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="app-button-ghost app-pressable px-4 py-2.5"
                >
                  Giris Yap
                </Link>
                <Link
                  href="/register"
                  className="app-button-primary app-pressable px-5 py-2.5"
                >
                  Kayit Ol
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen((currentState) => !currentState)}
            className="app-pressable inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 md:hidden"
            aria-expanded={isMobileOpen}
            aria-label="Menuyu ac"
          >
            Menu
          </button>
        </div>

        <MotionCollapse isOpen={isMobileOpen} className="md:hidden">
          <div className="space-y-3 border-t border-slate-200/80 py-4">
            <div className="flex flex-col gap-2">
              {publicLinks.map((link) => {
                const active = isActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleMobileNavigate}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {isReady ? (
              auth ? (
                <div className="space-y-2 border-t border-slate-200/80 pt-3">
                  <Link
                    href={notificationsHref}
                    onClick={handleMobileNavigate}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    <span>Bildirimler</span>
                    {hasUnreadNotifications ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                        {displayedUnreadNotificationCount}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    href={dashboardHref}
                    onClick={handleMobileNavigate}
                    className="block rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
                  >
                    Panelim
                  </Link>
                  <div className="flex items-center gap-2 px-1 text-sm text-slate-600">
                    <CustomerInitialsAvatar
                      name={`${auth.user?.ad ?? ""} ${auth.user?.soyad ?? ""}`}
                      fallback={auth.user?.kullaniciAdi ?? "NA"}
                      imageUrl={auth.user?.profileImageUrl}
                      size="sm"
                      tone="blue"
                    />
                    Merhaba, {getAuthLabel(auth)}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cikis Yap
                  </button>
                </div>
              ) : (
                <div className="space-y-2 border-t border-slate-200/80 pt-3">
                  <Link
                    href="/login"
                    onClick={handleMobileNavigate}
                    className="app-pressable block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Giris Yap
                  </Link>
                  <Link
                    href="/register"
                    onClick={handleMobileNavigate}
                    className="app-button-primary app-pressable block px-4 py-3 text-sm"
                  >
                    Kayit Ol
                  </Link>
                </div>
              )
            ) : null}
          </div>
        </MotionCollapse>
      </div>
    </nav>
  );
}
