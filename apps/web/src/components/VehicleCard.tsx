"use client";

import Image from "next/image";
import Link from "next/link";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type VehicleCardTone = "emerald" | "blue" | "amber" | "rose" | "slate";
type VehicleCardChipTone = "default" | "blue" | "emerald" | "amber";

type VehicleCardChip = {
  label: string;
  tone?: VehicleCardChipTone;
};

type VehicleSummaryItem = {
  label: string;
  value: string;
};

export type VehicleCardModel = {
  id: string;
  plaka: string;
  aracEtiketi: string;
  baslik: string;
  durumEtiketi: string;
  durumTonu: VehicleCardTone;
  durumAciklamasi: string;
  chipler: VehicleCardChip[];
  kapasiteOzeti: VehicleSummaryItem[];
  operasyonOzeti: VehicleSummaryItem[];
  kullanimOrani: number;
  kullanimEtiketi: string;
  imageUrl?: string;
  uyariMesaji: string | null;
  detailHref: string;
  editHref: string;
};

type VehicleCardProps = {
  vehicle: VehicleCardModel;
  isDeleting: boolean;
  onDelete: () => void;
};

const STATUS_TONE_STYLES: Record<VehicleCardTone, string> = {
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

const CHIP_TONE_STYLES: Record<VehicleCardChipTone, string> = {
  default: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
};

function clampUsage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function VehicleCard({
  vehicle,
  isDeleting,
  onDelete,
}: VehicleCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();
  const usagePercent = clampUsage(vehicle.kullanimOrani);

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-colors will-change-transform hover:border-blue-200"
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                  {vehicle.plaka}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {vehicle.aracEtiketi}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    STATUS_TONE_STYLES[vehicle.durumTonu]
                  }`}
                >
                  {vehicle.durumEtiketi}
                </span>
              </div>

              <div className="mt-4">
                <h2 className="text-[1.7rem] font-black tracking-tight text-slate-950">
                  {vehicle.baslik}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {vehicle.durumAciklamasi}
                </p>
              </div>

              {vehicle.chipler.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {vehicle.chipler.map((chip) => (
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
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="relative overflow-hidden rounded-[1.3rem] border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-50 p-5">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-blue-100/60 blur-2xl" />
              <div className="relative flex h-full min-h-[220px] flex-col justify-between gap-4">
                {vehicle.imageUrl ? (
                  <div className="overflow-hidden rounded-[1.2rem] border border-white/80 bg-white/80 shadow-sm">
                    <Image
                      src={vehicle.imageUrl}
                      alt={`${vehicle.baslik} fotografi`}
                      width={360}
                      height={180}
                      sizes="(min-width: 1280px) 220px, 100vw"
                      unoptimized
                      className="h-28 w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/80 bg-white text-blue-600 shadow-sm">
                    <i className="pi pi-truck text-[1.8rem]" />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Kapasite kullanimi
                  </p>
                  <p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-slate-950">
                    %{usagePercent}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {vehicle.kullanimEtiketi}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                  Kapasite ozeti
                </h3>
                <span className="text-sm font-semibold text-slate-600">%{usagePercent}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {vehicle.kapasiteOzeti.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1rem] border border-white/70 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                Operasyon ozeti
              </h3>

              <div className="mt-4 space-y-3">
                {vehicle.operasyonOzeti.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/70 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <p className="text-sm font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>

              {vehicle.uyariMesaji ? (
                <p className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {vehicle.uyariMesaji}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Link
            href={vehicle.detailHref}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Detay
          </Link>
          <Link
            href={vehicle.editHref}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Duzenle
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
    </article>
  );
}
