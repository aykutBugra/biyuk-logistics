"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type {
  CarrierRoutePreview,
} from "@/lib/dashboard/use-home-data";
import type { OpenOfferRequestListItem } from "@/lib/api/offers";
import {
  formatRouteDistanceKm,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type CarrierOpportunityPanelProps = {
  request: OpenOfferRequestListItem | null;
  routePreview: CarrierRoutePreview | null;
};

function buildDetailHref(
  requestId: number,
  routePreview: CarrierRoutePreview | null
): string {
  const searchParams = new URLSearchParams();

  if (routePreview) {
    searchParams.set("carrierRouteId", String(routePreview.route.id));
    searchParams.set("maxSapmaKm", String(routePreview.maxSapmaKm));
  }

  const queryString = searchParams.toString();
  return queryString
    ? `/dashboard/acik_istekler/${requestId}?${queryString}`
    : `/dashboard/acik_istekler/${requestId}`;
}

function buildImageAlt(request: OpenOfferRequestListItem): string {
  return `${request.baslangicSehri} -> ${request.varisSehri} yuk fotografi`;
}

export default function CarrierOpportunityPanel({
  request,
  routePreview,
}: CarrierOpportunityPanelProps) {
  if (!request) {
    return (
      <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Bugunun firsati
        </span>
        <h2 className="mt-4 text-[2rem] font-black tracking-tight text-slate-950">
          Uygun firsat bulunamadi
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          Acik talepleri kesfederek rotana uygun yukleri inceleyebilirsin.
        </p>
        <Link href="/dashboard/acik_istekler" className="app-button-primary mt-6">
          Acik istekleri kesfet
        </Link>
      </section>
    );
  }

  const detailHref = buildDetailHref(request.id, routePreview);
  const hasImage = Boolean(request.primaryImage);

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Bugunun firsati
      </span>

      <div className="mt-5 grid gap-5 lg:grid-cols-[7.5rem_minmax(0,1fr)]">
        <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
          {hasImage ? (
            <>
              <img
                src={request.primaryImage?.thumbnailUrl}
                alt={buildImageAlt(request)}
                className="h-full w-full object-contain"
              />
              {typeof request.imageCount === "number" && request.imageCount > 1 ? (
                <span className="absolute right-2 top-2 rounded-full bg-slate-900/78 px-2 py-1 text-[10px] font-semibold text-white">
                  +{request.imageCount - 1} fotograf
                </span>
              ) : null}
            </>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
              <i className="pi pi-box text-2xl" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-[2.1rem] font-black tracking-tight text-slate-950">
                {request.baslangicSehri} {"->"} {request.varisSehri}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {getCargoTypeLabel(request.yukTipi)}
                </span>
                {request.agirlikKg !== null ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {formatWeightKg(request.agirlikKg)}
                  </span>
                ) : null}
                {request.hacimM3 !== null ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {formatVolumeM3(request.hacimM3)}
                  </span>
                ) : null}
                {request.rotaUyumu?.extraMesafeMetre !== undefined ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Sapma {formatRouteDistanceKm(request.rotaUyumu.extraMesafeMetre)}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-500">
                {request.yukDetay || "Yuk detay bilgisi bu kayitta belirtilmedi."}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 lg:min-w-[180px] lg:items-end">
              {request.alreadyOffered ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Teklif verdin
                </span>
              ) : null}
              <Link href={detailHref} className="app-button-primary">
                Detay ve teklif
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
