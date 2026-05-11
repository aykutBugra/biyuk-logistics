"use client";

import Link from "next/link";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import StatusBadge from "@/components/StatusBadge";
import type { MyIncomingOfferItem } from "@/lib/api/offers";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type IncomingOfferCardProps = {
  offer: MyIncomingOfferItem;
  isFeatured?: boolean;
  isProcessingThis: boolean;
  isAnyProcessing: boolean;
  onAccept: (offer: MyIncomingOfferItem) => void;
  onReject: (offer: MyIncomingOfferItem) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function getOfferStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Bekliyor";
    case "KABUL_EDILDI":
      return "Kabul edildi";
    case "REDDEDILDI":
      return "Reddedildi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function getInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "NK";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function IncomingOfferCard({
  offer,
  isFeatured = false,
  isProcessingThis,
  isAnyProcessing,
  onAccept,
  onReject,
}: IncomingOfferCardProps) {
  const canDecide = offer.durum.trim().toUpperCase() === "OLUSTURULDU";
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white shadow-sm transition-colors will-change-transform ${
        isFeatured
          ? "border-emerald-200 shadow-[0_16px_36px_rgba(16,185,129,0.1)]"
          : "border-slate-200 hover:border-blue-200"
      }`}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={offer.durum} label={getOfferStatusLabel(offer.durum)} />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Teklif #{offer.id}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Istek #{offer.requestId}
          </span>
          {offer.aracPlaka ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {offer.aracPlaka}
            </span>
          ) : null}
          {isFeatured ? (
            <CustomerWorkspaceSignalPill tone="emerald" label="En iyi fiyat" />
          ) : null}
        </div>

        <h2 className="mt-3 text-[1.8rem] font-black tracking-tight text-slate-950">
          {`${offer.baslangicSehri} -> ${offer.varisSehri}`}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {`${formatLocationLabel(
            offer.baslangicKonumMetni,
            offer.baslangicSehri
          )} -> ${formatLocationLabel(offer.varisKonumMetni, offer.varisSehri)}`}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {getCargoTypeLabel(offer.yukTipi)}
          </span>
          {offer.agirlikKg !== null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {formatWeightKg(offer.agirlikKg)}
            </span>
          ) : null}
          {offer.hacimM3 !== null ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {formatVolumeM3(offer.hacimM3)}
            </span>
          ) : null}
          {offer.tekTasimaIstiyor ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Tek tasima
            </span>
          ) : null}
          {offer.tasimaTarihi ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {offer.tasimaTarihi}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
              {getInitials(offer.carrierName)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black tracking-tight text-slate-950">
                  {offer.carrierName}
                </p>
                <span className="text-sm text-slate-400">@{offer.carrierUsername}</span>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Nakliyeci notu
              </p>
              {offer.not ? (
                <p className="mt-2 line-clamp-3 max-w-2xl text-sm leading-6 text-slate-600">
                  {offer.not}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Teklif notu eklenmedi.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            <div className="xl:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Teklif fiyati
              </p>
              <p className="mt-2 text-[2.35rem] font-black leading-none tracking-tight text-emerald-600">
                {formatCurrency(offer.fiyat)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {canDecide ? (
                <button
                  type="button"
                  onClick={() => onAccept(offer)}
                  disabled={isAnyProcessing}
                  className="app-pressable inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessingThis ? "Isleniyor..." : "Kabul Et"}
                </button>
              ) : null}

              <Link href={`/dashboard/konusmalar/teklif/${offer.id}`} className="app-button-secondary">
                Konusmaya Git
              </Link>

              <Link href={`/dashboard/isteklerim/${offer.requestId}`} className="app-button-secondary">
                Istek Detayi
              </Link>

              {canDecide ? (
                <button
                  type="button"
                  onClick={() => onReject(offer)}
                  disabled={isAnyProcessing}
                  className="app-pressable inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessingThis ? "Isleniyor..." : "Reddet"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
