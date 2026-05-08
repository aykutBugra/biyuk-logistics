"use client";

import Link from "next/link";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";
import type { CarrierRouteListItem } from "@/lib/api/carrier-routes";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
} from "@/lib/logistics";

type RouteCardProps = {
  route: CarrierRouteListItem;
};

function formatPlannedDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const hasMetrics = (route: CarrierRouteListItem) =>
  route.rotaMesafeMetre !== null && route.rotaSureSaniye !== null;

export default function RouteCard({ route }: RouteCardProps) {
  const metricsReady = hasMetrics(route);
  const { elementRef, motionProps } =
    useOperationalCardMotion<HTMLElement>();

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors will-change-transform hover:border-blue-200"
    >
      {/* Header zone */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Rota #{route.id}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {formatPlannedDate(route.planlananTarih)}
          </span>
          {route.maksimumSapmaKm !== null ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Max sapma {route.maksimumSapmaKm.toFixed(1)} km
            </span>
          ) : null}
          {metricsReady ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Mesafe hazir
            </span>
          ) : null}
        </div>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          {formatLocationLabel(route.baslangicKonumMetni, route.baslangicSehri)}{" "}
          →{" "}
          {formatLocationLabel(route.varisKonumMetni, route.varisSehri)}
        </h2>
      </div>

      {/* Metrics zone */}
      <div className="flex flex-wrap gap-1.5 px-5 py-3">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {formatRouteDistanceKm(route.rotaMesafeMetre)}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {formatRouteDuration(route.rotaSureSaniye)}
        </span>
      </div>

      {/* Action zone */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <span className="text-xs text-slate-400">
          {formatDateTime(route.olusturmaTarihi)}
        </span>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/rotalarim/${route.id}`}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Detay
          </Link>
          <Link
            href={`/dashboard/rotalarim/${route.id}/duzenle`}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Duzenle
          </Link>
        </div>
      </div>
    </article>
  );
}
