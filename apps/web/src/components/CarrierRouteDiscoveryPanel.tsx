"use client";

import Link from "next/link";
import type { CarrierRoutePreview } from "@/lib/dashboard/use-home-data";

type CarrierRouteDiscoveryPanelProps = {
  routePreview: CarrierRoutePreview | null;
};

function buildDiscoveryHref(routePreview: CarrierRoutePreview): string {
  const searchParams = new URLSearchParams({
    carrierRouteId: String(routePreview.route.id),
    maxSapmaKm: String(routePreview.maxSapmaKm),
  });

  return `/dashboard/acik_istekler?${searchParams.toString()}`;
}

function formatAverageDeviation(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value)} km`;
}

export default function CarrierRouteDiscoveryPanel({
  routePreview,
}: CarrierRouteDiscoveryPanelProps) {
  if (!routePreview) {
    return (
      <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
        <h2 className="text-[1.9rem] font-black tracking-tight text-slate-950">
          Rota bazli kesif
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Kayitli rota olmadiginda sana uygun yukleri rota uyumuna gore onizleyemiyoruz.
        </p>
        <div className="mt-6 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 p-5">
          <p className="text-base font-semibold text-slate-900">Kayitli rota yok</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Rota eklediginde sana daha uygun yukler onerilebilir.
          </p>
          <Link href="/dashboard/rotalarim/yeni" className="app-button-primary mt-5">
            Rota olustur
          </Link>
        </div>
      </section>
    );
  }

  const averageDeviation = formatAverageDeviation(routePreview.averageDeviationKm);

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
      <h2 className="text-[1.9rem] font-black tracking-tight text-slate-950">
        Rota bazli kesif
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        {routePreview.route.baslangicSehri} {"->"} {routePreview.route.varisSehri} rotasinda{" "}
        {routePreview.suitableCount} uygun talep var.
      </p>

      <div className="mt-5 rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-5">
            <div className="relative h-24 overflow-hidden rounded-[1.1rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="absolute inset-x-4 bottom-6 h-px bg-blue-200" />
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2">
                <svg viewBox="0 0 320 80" className="h-20 w-full text-blue-500">
                  <path
                    d="M10 52 L85 32 L155 46 L230 28 L308 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="52" r="5" fill="currentColor" />
                  <circle cx="85" cy="32" r="5" fill="currentColor" />
                  <circle cx="155" cy="46" r="5" fill="currentColor" />
                  <circle cx="230" cy="28" r="5" fill="currentColor" />
                  <circle cx="308" cy="18" r="5" fill="currentColor" />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                Maks. sapma: {routePreview.maxSapmaKm} km
              </span>
              {averageDeviation ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                  Ortalama sapma: {averageDeviation}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Secili rota
                </p>
                <p className="mt-2 text-base font-bold text-slate-950">
                  {routePreview.route.baslangicSehri} {"->"} {routePreview.route.varisSehri}
                </p>
              </div>
              <div className="rounded-[1.1rem] border border-emerald-100 bg-emerald-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Uygun talep
                </p>
                <p className="mt-2 text-base font-bold text-emerald-700">
                  {routePreview.suitableCount} kayit
                </p>
              </div>
            </div>

            <Link href={buildDiscoveryHref(routePreview)} className="app-button-primary">
              Kesfe git
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
