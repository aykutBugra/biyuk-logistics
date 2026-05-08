"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";
import type { TransportRequestListItem } from "@/lib/api/transport-requests";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type MyRequestCardProps = {
  request: TransportRequestListItem;
  isDeleting: boolean;
  onDelete: (id: number) => void;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getRequestStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Acik";
    case "ANLASILDI":
      return "Anlasma saglandi";
    case "TAMAMLANDI":
      return "Tamamlandi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function getNextStepHint(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Gelen teklifleri detaydan goruntule";
    case "ANLASILDI":
      return "Nakliye sureci devam ediyor";
    case "TAMAMLANDI":
      return "Nakliye tamamlandi";
    case "IPTAL_EDILDI":
      return "Bu istek iptal edildi";
    default:
      return "";
  }
}

export default function MyRequestCard({
  request,
  isDeleting,
  onDelete,
}: MyRequestCardProps) {
  const nextStepHint = getNextStepHint(request.durum);
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLDivElement>();

  return (
    <div
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors will-change-transform hover:border-blue-200"
    >
      {/* Zone 1: status + id + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={request.durum}
            label={getRequestStatusLabel(request.durum)}
          />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            #{request.id}
          </span>
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {formatDate(request.olusturmaTarihi)}
        </span>
      </div>

      {/* Zone 2: route + cargo chips + description */}
      <div className="mt-3 flex gap-3">
        {request.primaryImage ? (
          <div className="relative shrink-0">
            <img
              src={request.primaryImage.thumbnailUrl}
              alt="Ana fotograf"
              className="h-16 w-20 rounded-xl object-cover border border-slate-200 bg-slate-100"
            />
            {request.imageCount && request.imageCount > 1 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-bold text-white">
                +{request.imageCount - 1}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          {formatLocationLabel(
            request.baslangicKonumMetni,
            request.baslangicSehri
          )}{" "}
          →{" "}
          {formatLocationLabel(request.varisKonumMetni, request.varisSehri)}
        </h2>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {getCargoTypeLabel(request.yukTipi)}
          </span>
          {request.agirlikKg !== null ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {formatWeightKg(request.agirlikKg)}
            </span>
          ) : null}
          {request.hacimM3 !== null ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {formatVolumeM3(request.hacimM3)}
            </span>
          ) : null}
          {request.tekTasimaIstiyor ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Tek tasima
            </span>
          ) : null}
          {request.tasimaTarihi ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {request.tasimaTarihi}
            </span>
          ) : null}
        </div>

        {request.yukDetay ? (
          <p className="line-clamp-2 text-sm leading-6 text-slate-500">
            {request.yukDetay}
          </p>
        ) : null}
        </div>
      </div>

      {/* Zone 3: next-step hint + actions */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {nextStepHint ? (
          <p className="text-xs text-slate-500">{nextStepHint}</p>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/isteklerim/${request.id}`}
            className="app-pressable inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Detay
          </Link>
          <Link
            href={`/dashboard/isteklerim/${request.id}/duzenle`}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Duzenle
          </Link>
          <button
            type="button"
            onClick={() => onDelete(request.id)}
            disabled={isDeleting}
            className="app-pressable text-sm font-semibold text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}
