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
  variant: "primary" | "secondary" | "ghost";
};

function ActionLink({ href, label, variant }: HomeAction) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
        variant === "primary"
          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          : variant === "secondary"
            ? "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

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
    return <div className="h-64 rounded-3xl border border-slate-200 bg-white shadow-sm" />;
  }

  const isCarrier = storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI);
  const isCustomer = storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI);

  if (!isCarrier && !isCustomer) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
            Musteri girisi
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            Yuk gondermek istiyorum
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tasima talebini olustur, gelen teklifleri karsilastir ve anlasilan
            isi ayni panelden takip et.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/register" label="Hemen kayit ol" variant="primary" />
            <ActionLink href="/login" label="Giris yap" variant="secondary" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
            Nakliyeci girisi
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            Tasima isi bulmak istiyorum
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Acik istekleri incele, araclarinla uygun teklifleri ver ve
            anlasilan nakliyeleri operasyon akisi icinde yurut.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink
              href="/register"
              label="Nakliyeci olarak kayit ol"
              variant="primary"
            />
            <ActionLink href="/login" label="Giris yap" variant="secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (isCarrier) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
              Nakliyeci launchpad
            </p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              Bugun ne yapmak istiyorsun?
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Kesif akisindan acik istek bul, tekliflerini takip et ve
              anlasilan nakliyeleri yonet. Arac ekleme bu panelde yardimci
              onboarding aksiyonu olarak kalir.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink
              href="/dashboard/acik_istekler"
              label="Acik Istekler"
              variant="primary"
            />
            <ActionLink
              href="/dashboard/tekliflerim"
              label="Tekliflerim"
              variant="secondary"
            />
            <ActionLink
              href="/dashboard/nakliyelerim"
              label="Nakliyelerim"
              variant="secondary"
            />
            <ActionLink
              href="/dashboard/araclarim"
              label="Araclarim"
              variant="secondary"
            />
            <ActionLink
              href="/dashboard/arac_ekle"
              label="Arac Ekle"
              variant="secondary"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
            Musteri launchpad
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Tasima talebini hizli sekilde yonet
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Yeni istek olustur, mevcut taleplerini gor ve anlasilan nakliye
            durumunu request detayi icinden takip et.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ActionLink href="/dashboard/istek_ekle" label="Istek Ekle" variant="primary" />
          <ActionLink
            href="/dashboard/isteklerim"
            label="Isteklerim"
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}
