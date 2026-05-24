"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { OpenOfferRequestListItem } from "@/lib/api/offers";
import { formatDateOnly } from "@/lib/date-only";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type OpenRequestCardProps = {
  request: OpenOfferRequestListItem;
  isSelected: boolean;
  detailHref: string;
  selectedCarrierRouteId: string | null;
  onCardClick: (requestId: string) => void;
  cardRef: (node: HTMLDivElement | null) => void;
};

type RouteCompatLabel = "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getCompatToneClasses(label: RouteCompatLabel): string {
  switch (label) {
    case "UYGUN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "SINIRDA":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "UYGUN_DEGIL":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getCompatStripClasses(label: RouteCompatLabel): string {
  switch (label) {
    case "UYGUN":
      return "border-emerald-200 bg-emerald-50/80";
    case "SINIRDA":
      return "border-amber-200 bg-amber-50/80";
    case "UYGUN_DEGIL":
      return "border-rose-200 bg-rose-50/80";
    default:
      return "border-slate-200 bg-slate-50";
  }
}

function getCompatLabelText(label: RouteCompatLabel): string {
  switch (label) {
    case "UYGUN":
      return "Uygun";
    case "SINIRDA":
      return "Sinirda";
    case "UYGUN_DEGIL":
      return "Uygun degil";
    default:
      return label;
  }
}

function buildRouteSubtitle(request: OpenOfferRequestListItem): string | null {
  const baslangicDetay = request.baslangicKonumMetni?.trim();
  const varisDetay = request.varisKonumMetni?.trim();
  const hasMeaningfulDetay =
    (baslangicDetay && baslangicDetay !== request.baslangicSehri) ||
    (varisDetay && varisDetay !== request.varisSehri);

  if (!hasMeaningfulDetay) {
    return null;
  }

  return `${formatLocationLabel(
    request.baslangicKonumMetni,
    request.baslangicSehri
  )} - ${formatLocationLabel(request.varisKonumMetni, request.varisSehri)}`;
}

export default function OpenRequestCard({
  request,
  isSelected,
  detailHref,
  selectedCarrierRouteId,
  onCardClick,
  cardRef,
}: OpenRequestCardProps) {
  const routeCompatibility =
    selectedCarrierRouteId !== null ? request.rotaUyumu : null;
  const routeSubtitle = buildRouteSubtitle(request);
  const hasImage = Boolean(request.primaryImage);

  return (
    <article
      ref={cardRef}
      data-dashboard-card
      onClick={() => onCardClick(request.id)}
      className={`h-full cursor-pointer rounded-[1.2rem] border bg-white p-4 shadow-sm transition ${
        isSelected
          ? "border-blue-300 ring-2 ring-blue-100"
          : "border-slate-200 hover:border-blue-200"
      }`}
    >
      <div
        className={`h-full ${hasImage ? "grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)]" : "flex flex-col gap-3.5"}`}
      >
        {request.primaryImage ? (
          <div className="relative overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-100 p-2">
            <img
              src={request.primaryImage.thumbnailUrl}
              alt={`${request.baslangicSehri} - ${request.varisSehri} yuk fotografi`}
              className="h-full min-h-[12rem] w-full rounded-[0.8rem] object-contain"
            />
            {typeof request.imageCount === "number" && request.imageCount > 1 ? (
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                +{request.imageCount - 1} fotograf
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex h-full flex-col gap-3.5">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {routeCompatibility ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCompatToneClasses(
                    routeCompatibility.uygunlukEtiketi as RouteCompatLabel
                  )}`}
                >
                  {getCompatLabelText(
                    routeCompatibility.uygunlukEtiketi as RouteCompatLabel
                  )}
                </span>
              ) : null}
              {request.alreadyOffered ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Teklif verdin
                </span>
              ) : null}
              <StatusBadge status={request.durum} />
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1">Istek</span>
              <span>{formatDate(request.olusturmaTarihi)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-black tracking-tight text-slate-950 md:text-[1.35rem]">
                {request.baslangicSehri} - {request.varisSehri}
              </h2>
              {routeSubtitle ? (
                <p className="text-sm leading-5 text-slate-500">{routeSubtitle}</p>
              ) : null}
              {request.rotaMesafeMetre !== null || request.rotaSureSaniye !== null ? (
                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                  {request.rotaMesafeMetre !== null ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {formatRouteDistanceKm(request.rotaMesafeMetre)}
                    </span>
                  ) : null}
                  {request.rotaSureSaniye !== null ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {formatRouteDuration(request.rotaSureSaniye)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Link
              href={detailHref}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Detay ve Teklif
            </Link>
          </div>

          {routeCompatibility ? (
            <div
              className={`rounded-[0.95rem] border px-3.5 py-2.5 ${getCompatStripClasses(
                routeCompatibility.uygunlukEtiketi as RouteCompatLabel
              )}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                <span
                  className={`rounded-full border px-2.5 py-1 ${getCompatToneClasses(
                    routeCompatibility.uygunlukEtiketi as RouteCompatLabel
                  )}`}
                >
                  {getCompatLabelText(
                    routeCompatibility.uygunlukEtiketi as RouteCompatLabel
                  )}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-white/80">
                  Ek {formatRouteDistanceKm(routeCompatibility.extraMesafeMetre)}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-white/80">
                  Ek {formatRouteDuration(routeCompatibility.extraSureSaniye)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
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
            {request.tasimaTarihi ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Tercih {formatDateOnly(request.tasimaTarihi)}
              </span>
            ) : null}
            {request.tekTasimaIstiyor ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                Tek tasima
              </span>
            ) : null}
          </div>

          {request.yukDetay ? (
            <p className="mt-auto line-clamp-2 text-sm leading-6 text-slate-600">
              {request.yukDetay}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
