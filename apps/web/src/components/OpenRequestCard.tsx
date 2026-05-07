import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { OpenOfferRequestListItem } from "@/lib/api/offers";
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
  selectedCarrierRouteId: number | null;
  onCardClick: (requestId: number) => void;
  cardRef: (node: HTMLDivElement | null) => void;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

type RouteCompatLabel = "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";

function getCompatAccentClass(label: RouteCompatLabel): string {
  switch (label) {
    case "UYGUN":
      return "border-l-2 border-emerald-400 bg-emerald-50/60";
    case "SINIRDA":
      return "border-l-2 border-amber-400 bg-amber-50/60";
    case "UYGUN_DEGIL":
      return "border-l-2 border-rose-400 bg-rose-50/60";
    default:
      return "border-l-2 border-slate-300 bg-slate-50";
  }
}

function getCompatBadgeClass(label: RouteCompatLabel): string {
  switch (label) {
    case "UYGUN":
      return "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700";
    case "SINIRDA":
      return "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700";
    case "UYGUN_DEGIL":
      return "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700";
    default:
      return "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700";
  }
}

function getCompatLabelText(label: RouteCompatLabel): string {
  switch (label) {
    case "UYGUN":
      return "Uygun";
    case "SINIRDA":
      return "Sınırda";
    case "UYGUN_DEGIL":
      return "Uygun değil";
    default:
      return label;
  }
}

export default function OpenRequestCard({
  request,
  isSelected,
  detailHref,
  selectedCarrierRouteId,
  onCardClick,
  cardRef,
}: OpenRequestCardProps) {
  return (
    <div
      ref={cardRef}
      onClick={() => onCardClick(request.id)}
      className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
        isSelected
          ? "border-blue-300 bg-blue-50/30 ring-2 ring-blue-100"
          : "border-slate-200 hover:border-blue-200 hover:shadow-md"
      }`}
    >
      {/* Top row: status + id + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.durum} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            #{request.id}
          </span>
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {formatDate(request.olusturmaTarihi)}
        </span>
      </div>

      {/* Already-offered badge */}
      {request.alreadyOffered ? (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
            <i className="pi pi-check text-[10px]" />
            Teklif verdin
          </span>
        </div>
      ) : null}

      {/* Route header + CTA */}
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          {formatLocationLabel(
            request.baslangicKonumMetni,
            request.baslangicSehri
          )}{" "}
          →{" "}
          {formatLocationLabel(request.varisKonumMetni, request.varisSehri)}
        </h2>
        <Link
          href={detailHref}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Detay ve Teklif
          <i className="pi pi-arrow-right text-xs" />
        </Link>
      </div>

      {/* Cargo chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
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
            Tek taşıma
          </span>
        ) : null}
        {request.tasimaTarihi ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {request.tasimaTarihi}
          </span>
        ) : null}
      </div>

      {/* Route compatibility block */}
      {selectedCarrierRouteId !== null && request.rotaUyumu ? (
        <div
          className={`mt-4 rounded-r-xl px-3 py-2.5 ${getCompatAccentClass(
            request.rotaUyumu.uygunlukEtiketi as RouteCompatLabel
          )}`}
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Rota uyumu
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={getCompatBadgeClass(
                request.rotaUyumu.uygunlukEtiketi as RouteCompatLabel
              )}
            >
              {getCompatLabelText(
                request.rotaUyumu.uygunlukEtiketi as RouteCompatLabel
              )}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Ek {formatRouteDistanceKm(request.rotaUyumu.extraMesafeMetre)}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Ek {formatRouteDuration(request.rotaUyumu.extraSureSaniye)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Cargo detail summary */}
      {request.yukDetay ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
          {request.yukDetay}
        </p>
      ) : null}
    </div>
  );
}
