"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  STORED_ROLE_NAMES,
  getStoredAuth,
  storedAuthHasRole,
  subscribeToAuthChanges,
  type StoredAuth,
} from "@/lib/auth/auth-storage";

export default function HomeCustomerActions() {
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

  if (!isReady) {
    return <div className="mt-10 h-14" aria-hidden />;
  }

  const isCarrier = storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI);
  const isCustomer = storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI);

  if (!isCarrier && !isCustomer) {
    return null;
  }

  const primaryAction = isCarrier
    ? {
        href: "/dashboard/arac_ekle",
        label: "Arac Ekle",
      }
    : {
        href: "/dashboard/istek_ekle",
        label: "Yeni Istek Ekle",
      };

  const secondaryAction = isCarrier
    ? {
        href: "/dashboard/araclarim",
        label: "Araclarimi Gor",
      }
    : {
        href: "/dashboard/isteklerim",
        label: "Isteklerimi Gor",
      };

  return (
    <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
      <Link
        href={primaryAction.href}
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700"
      >
        {primaryAction.label}
      </Link>
      <Link
        href={secondaryAction.href}
        className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-6 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
      >
        {secondaryAction.label}
      </Link>
    </div>
  );
}
