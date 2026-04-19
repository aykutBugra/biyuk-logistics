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

type HomeAction = {
  href: string;
  label: string;
  variant: "primary" | "secondary";
};

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

  const actions: HomeAction[] = isCarrier
    ? [
        {
          href: "/dashboard/arac_ekle",
          label: "Arac Ekle",
          variant: "primary",
        },
        {
          href: "/dashboard/araclarim",
          label: "Araclarim",
          variant: "secondary",
        },
        {
          href: "/dashboard/acik_istekler",
          label: "Acik Istekler",
          variant: "secondary",
        },
        {
          href: "/dashboard/tekliflerim",
          label: "Tekliflerim",
          variant: "secondary",
        },
      ]
    : [
        {
          href: "/dashboard/istek_ekle",
          label: "Istek Ekle",
          variant: "primary",
        },
        {
          href: "/dashboard/isteklerim",
          label: "Isteklerim",
          variant: "secondary",
        },
      ];

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
            action.variant === "primary"
              ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
              : "border border-blue-200 text-blue-700 hover:bg-blue-50"
          }`}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
