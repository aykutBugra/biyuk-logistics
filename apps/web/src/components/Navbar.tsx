"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearStoredAuth,
  getStoredAuth,
  subscribeToAuthChanges,
  type StoredAuth,
} from "@/lib/auth/auth-storage";

function getAuthLabel(auth: StoredAuth | null): string {
  if (!auth?.user) {
    return "Giris yapildi";
  }

  return auth.user.kullaniciAdi || auth.user.ad || "Merhaba";
}

export default function Navbar() {
  const router = useRouter();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setAuth(getStoredAuth());
      setIsReady(true);
    };

    syncAuth();

    return subscribeToAuthChanges(syncAuth);
  }, []);

  const handleLogout = () => {
    clearStoredAuth();
    router.replace("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="shrink-0 flex items-center">
            <Link
              href="/"
              className="text-2xl font-black tracking-tighter text-blue-900"
            >
              Nakliye Sitesi<span className="text-blue-600">.</span>
            </Link>
          </div>

          <div className="hidden items-center space-x-8 md:flex">
            <Link
              href="/"
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Ana Sayfa
            </Link>
            <Link
              href="/hakkimizda"
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Hakkimizda
            </Link>
            <Link
              href="/iletisim"
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Iletisim
            </Link>
          </div>

          <div className="flex min-w-[220px] items-center justify-end gap-4">
            {!isReady ? (
              <div className="h-10 w-full" aria-hidden />
            ) : auth ? (
              <>
                <span className="whitespace-nowrap text-sm font-medium text-gray-600">
                  {auth.user ? `Merhaba, ${getAuthLabel(auth)}` : getAuthLabel(auth)}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 font-semibold text-gray-700 transition-all hover:text-blue-600"
                >
                  Cikis Yap
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 font-semibold text-gray-700 transition-all hover:text-blue-600"
                >
                  Giris Yap
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-blue-200"
                >
                  Kayit Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
