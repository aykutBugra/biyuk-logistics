"use client";

import Link from "next/link";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type RouteCardTone = "emerald" | "blue" | "amber" | "slate";
type RouteCardChipTone = "default" | "blue" | "emerald" | "amber";

type RouteCardChip = {
  label: string;
  tone?: RouteCardChipTone;
};

export type RouteCardModel = {
  id: string;
  rotaBaslik: string;
  rotaDetay: string | null;
  durumEtiketi: string;
  durumTonu: RouteCardTone;
  durumAciklamasi: string;
  olusturmaBilgisi: string;
  eslesmeBilgisi: string | null;
  chipler: RouteCardChip[];
  detailHref: string;
  editHref: string;
};

type RouteCardProps = {
  route: RouteCardModel;
};

const STATUS_TONE_STYLES: Record<RouteCardTone, string> = {
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

const CHIP_TONE_STYLES: Record<RouteCardChipTone, string> = {
  default: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
};

export default function RouteCard({ route }: RouteCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className="rounded-[1.45rem] border border-slate-200 bg-white shadow-sm transition-colors will-change-transform hover:border-blue-200"
    >
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Rota
          </span>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
              STATUS_TONE_STYLES[route.durumTonu]
            }`}
          >
            {route.durumEtiketi}
          </span>
          {route.eslesmeBilgisi ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {route.eslesmeBilgisi}
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
            {route.rotaBaslik}
          </h2>
          {route.rotaDetay ? (
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {route.rotaDetay}
            </p>
          ) : null}
        </div>

        {route.chipler.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {route.chipler.map((chip) => (
              <span
                key={chip.label}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  CHIP_TONE_STYLES[chip.tone ?? "default"]
                }`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3.5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">Kayit: {route.olusturmaBilgisi}</p>

          <div className="flex flex-wrap gap-2">
            <Link
              href={route.detailHref}
              className="app-pressable inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Detay
            </Link>
            <Link
              href={route.editHref}
              className="app-pressable inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Duzenle
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
