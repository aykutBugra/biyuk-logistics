"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import StatusBadge from "@/components/StatusBadge";
import type { TransportRequestListItem } from "@/lib/api/transport-requests";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type MyRequestCardProps = {
  request: TransportRequestListItem;
  offerCount?: number;
  isDeleting: boolean;
  onDelete: () => void;
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
      return "Anlasildi";
    case "TAMAMLANDI":
      return "Tamamlandi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function getRequestSupportLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
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

function formatRouteTitle(request: TransportRequestListItem): string {
  return `${request.baslangicSehri} -> ${request.varisSehri}`;
}

function formatRouteMeta(request: TransportRequestListItem): string | null {
  const pickup = request.baslangicKonumMetni?.trim();
  const dropoff = request.varisKonumMetni?.trim();
  const pickupLabel = pickup && pickup !== request.baslangicSehri ? pickup : null;
  const dropoffLabel = dropoff && dropoff !== request.varisSehri ? dropoff : null;

  if (!pickupLabel && !dropoffLabel) {
    return null;
  }

  return `${pickupLabel ?? request.baslangicSehri} -> ${
    dropoffLabel ?? request.varisSehri
  }`;
}

export default function MyRequestCard({
  request,
  offerCount = 0,
  isDeleting,
  onDelete,
}: MyRequestCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLDivElement>();
  const normalizedStatus = request.durum.trim().toUpperCase();
  const routeMeta = formatRouteMeta(request);
  const supportLabel = getRequestSupportLabel(request.durum);
  const isOpenRequest = normalizedStatus === "OLUSTURULDU";
  const signalTone = isOpenRequest
    ? offerCount > 0
      ? "emerald"
      : "amber"
    : "slate";
  const signalLabel = isOpenRequest
    ? offerCount > 0
      ? `${offerCount} teklif geldi`
      : "Henuz teklif yok"
    : supportLabel;

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white p-4 shadow-sm transition-colors will-change-transform md:p-5 ${
        isOpenRequest && offerCount > 0
          ? "border-blue-200 shadow-[0_14px_34px_rgba(37,99,235,0.08)]"
          : "border-slate-200 hover:border-blue-200"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
            {request.primaryImage ? (
              <>
                <img
                  src={request.primaryImage.thumbnailUrl}
                  alt="Tasima istegi fotografi"
                  className="h-full w-full bg-slate-100 object-contain p-2"
                />
                {request.imageCount && request.imageCount > 1 ? (
                  <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-white">
                    +{request.imageCount - 1}
                  </span>
                ) : null}
              </>
            ) : (
              <i className="pi pi-box text-2xl text-slate-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={request.durum} label={getRequestStatusLabel(request.durum)} />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                #{request.id}
              </span>
              {request.imageCount && request.imageCount > 1 && !request.primaryImage ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  +{request.imageCount} fotograf
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-[1.8rem] font-black tracking-tight text-slate-950">
              {formatRouteTitle(request)}
            </h2>

            {routeMeta ? (
              <p className="mt-1 text-sm text-slate-500">{routeMeta}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {getCargoTypeLabel(request.yukTipi)}
              </span>
              {request.agirlikKg !== null ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {formatWeightKg(request.agirlikKg)}
                </span>
              ) : null}
              {request.hacimM3 !== null ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {formatVolumeM3(request.hacimM3)}
                </span>
              ) : null}
              {request.tekTasimaIstiyor ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Tek tasima
                </span>
              ) : null}
              {request.tasimaTarihi ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {request.tasimaTarihi}
                </span>
              ) : null}
            </div>

            {request.yukDetay ? (
              <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
                {request.yukDetay}
              </p>
            ) : null}

            {signalLabel ? (
              <div className="mt-4">
                <CustomerWorkspaceSignalPill tone={signalTone} label={signalLabel} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:min-w-[230px] xl:items-end">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            {formatDate(request.olusturmaTarihi)}
          </span>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Link href={`/dashboard/isteklerim/${request.id}`} className="app-button-primary">
              Detay
            </Link>
            <Link
              href={`/dashboard/isteklerim/${request.id}/duzenle`}
              className="app-button-secondary"
            >
              Duzenle
            </Link>
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="app-pressable inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
