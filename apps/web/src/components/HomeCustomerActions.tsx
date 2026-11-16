"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSurfaceReveal } from "@/lib/motion/useSurfaceReveal";
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
      className={
        variant === "primary"
          ? "app-button-primary app-pressable"
          : variant === "secondary"
            ? "app-button-secondary app-pressable"
            : "app-button-ghost app-pressable"
      }
    >
      {label}
    </Link>
  );
}

function LaunchpadSurface({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <div className="app-surface rounded-[1.2rem] border border-slate-200 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}

export default function HomeCustomerActions() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isReady, setIsReady] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useSurfaceReveal(contentRef, {
    disabled: !isReady,
    rememberKey: "public-home-customer-actions",
    delay: 0.04,
  });

  useEffect(() => {
    const syncAuth = () => {
      setAuth(getStoredAuth());
      setIsReady(true);
    };

    syncAuth();

    return subscribeToAuthChanges(syncAuth);
  }, []);

  if (!isReady) {
    return <div className="app-surface h-52 rounded-[1.25rem]" data-motion-skip />;
  }

  const isCarrier = storedAuthHasRole(auth, STORED_ROLE_NAMES.NAKLIYECI);
  const isCustomer = storedAuthHasRole(auth, STORED_ROLE_NAMES.MUSTERI);
  const hasDualBusinessRoles = isCarrier && isCustomer;

  let content: ReactNode;

  if (!isCarrier && !isCustomer) {
    content = (
      <div className="grid gap-5 lg:grid-cols-2">
        <LaunchpadSurface
          eyebrow="Talep Paneli"
          title="Yuk gondermek istiyorum"
          description="Tasima talebini olustur, teklifleri karsilastir ve anlasilan isi ayni panelden takip et."
          actions={
            <>
              <ActionLink href="/register" label="Hemen kayit ol" variant="primary" />
              <ActionLink href="/login" label="Giris yap" variant="secondary" />
            </>
          }
        />
        <LaunchpadSurface
          eyebrow="Nakliye Paneli"
          title="Tasima isi bulmak istiyorum"
          description="Açık talepleri incele, uygun teklifleri ver ve anlasilan nakliyeleri operasyon akisi içinde yurut."
          actions={
            <>
              <ActionLink
                href="/register"
                label="Talep ve nakliye için kayıt ol"
                variant="primary"
              />
              <ActionLink href="/login" label="Giris yap" variant="secondary" />
            </>
          }
        />
      </div>
    );
  } else if (hasDualBusinessRoles) {
    content = (
      <div className="grid gap-5 lg:grid-cols-2">
        <LaunchpadSurface
          eyebrow="Talep Paneli"
          title="Talep ve teklif tarafina gec"
          description="Talep Paneli’nde taleplerini, gelen teklifleri ve sonrasindaki karar akislarini one cikarirsin."
          actions={<ActionLink href="/dashboard" label="Panel seç" variant="primary" />}
        />
        <LaunchpadSurface
          eyebrow="Nakliye Paneli"
          title="Kesif ve operasyon tarafina gec"
          description="Nakliye Paneli’nde açık talepler, rotalar, araclar ve aktif operasyon tarafini one cikarirsin."
          actions={<ActionLink href="/dashboard" label="Panel seç" variant="secondary" />}
        />
      </div>
    );
  } else if (isCarrier) {
    content = (
      <div className="app-surface rounded-[1.2rem] border border-slate-200 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
              Nakliye Paneli
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Bugun ne yapmak istiyorsun?
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Kesif akisindan açık talep bul, tekliflerini takip et ve anlasilan
              nakliyeleri yonet. Arac ekleme yardimci onboarding aksiyonu olarak kalir.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink href="/dashboard/acik_istekler" label="Açık Talepler" variant="primary" />
            <ActionLink href="/dashboard/tekliflerim" label="Tekliflerim" variant="secondary" />
            <ActionLink href="/dashboard/nakliyelerim" label="Taşımalarım" variant="secondary" />
            <ActionLink href="/dashboard/araclarim" label="Araclarim" variant="secondary" />
            <ActionLink href="/dashboard/arac_ekle" label="Arac Ekle" variant="secondary" />
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="app-surface rounded-[1.2rem] border border-slate-200 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-600">
              Talep Paneli
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Tasima talebini hizli sekilde yonet
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Yeni talep oluştur, mevcut taleplerini gor ve anlasilan nakliye durumunu
              talep detayından takip et.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink href="/dashboard/istek_ekle" label="Talep Ekle" variant="primary" />
            <ActionLink href="/dashboard/isteklerim" label="Taleplerim" variant="secondary" />
          </div>
        </div>
      </div>
    );
  }

  return <div ref={contentRef}>{content}</div>;
}
