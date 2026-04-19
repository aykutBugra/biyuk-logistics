"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  STORED_ROLE_NAMES,
  clearStoredAuth,
  getStoredAuth,
  storedAuthHasRole,
  subscribeToAuthChanges,
  type StoredAuth,
} from "@/lib/auth/auth-storage";

function getAuthLabel(auth: StoredAuth | null): string {
  if (!auth?.user) {
    return "Merhaba";
  }

  return auth.user.kullaniciAdi || auth.user.ad || "Merhaba";
}

function getDashboardHref(auth: StoredAuth | null): string {
  if (storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI)) {
    return "/dashboard/acik_istekler";
  }

  if (storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI)) {
    return "/dashboard/isteklerim";
  }

  return "/";
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

  useEffect(() => {
    const syncAuth = () => {
      setAuth(getStoredAuth());
      setIsReady(true);
    };

    syncAuth();

    return subscribeToAuthChanges(syncAuth);
  }, []);

  const dashboardHref = useMemo(() => getDashboardHref(auth), [auth]);

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
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-2xl font-black tracking-tight text-slate-950 transition hover:text-blue-700"
            >
              Bi<span className="text-blue-600">’</span>yük
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              {publicLinks.map((link) => {
                const active = isActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
                  href={dashboardHref}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    pathname.startsWith("/dashboard")
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  Panelim
                </Link>
                <span className="whitespace-nowrap text-sm font-medium text-slate-600">
                  Merhaba, {getAuthLabel(auth)}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Cikis Yap
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Giris Yap
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Kayit Ol
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen((currentState) => !currentState)}
            className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden"
            aria-expanded={isMobileOpen}
            aria-label="Menuyu ac"
          >
            Menu
          </button>
        </div>

        {isMobileOpen ? (
          <div className="space-y-3 border-t border-slate-200 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {publicLinks.map((link) => {
                const active = isActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleMobileNavigate}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {isReady ? (
              auth ? (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <Link
                    href={dashboardHref}
                    onClick={handleMobileNavigate}
                    className="block rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
                  >
                    Panelim
                  </Link>
                  <p className="px-1 text-sm text-slate-600">
                    Merhaba, {getAuthLabel(auth)}
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                  >
                    Cikis Yap
                  </button>
                </div>
              ) : (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <Link
                    href="/login"
                    onClick={handleMobileNavigate}
                    className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Giris Yap
                  </Link>
                  <Link
                    href="/register"
                    onClick={handleMobileNavigate}
                    className="block rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Kayit Ol
                  </Link>
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
