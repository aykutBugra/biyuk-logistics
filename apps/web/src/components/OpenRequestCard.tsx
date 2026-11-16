"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { getRequestStatusLabel } from "@/features/transport-requests/request-list-model";
import styles from "./discovery.module.css";
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
  request, isSelected, detailHref, selectedCarrierRouteId, onCardClick, cardRef,
}: OpenRequestCardProps) {
  const routeCompatibility = selectedCarrierRouteId !== null ? request.rotaUyumu : null;
  const routeSubtitle = buildRouteSubtitle(request);

  return (
    <article ref={cardRef} data-dashboard-card onClick={() => onCardClick(request.id)} className={[styles.requestCard, isSelected ? styles.requestSelected : ""].join(" ")}>
      <div className={styles.requestTopline}>
        <div className={styles.requestBadges}>
          <StatusBadge status={request.durum} label={getRequestStatusLabel(request.durum)} />
          {routeCompatibility ? <span className={styles.compatBadge + " " + getCompatToneClasses(routeCompatibility.uygunlukEtiketi as RouteCompatLabel)}>{getCompatLabelText(routeCompatibility.uygunlukEtiketi as RouteCompatLabel)}</span> : null}
          {request.alreadyOffered ? <span className={styles.offeredBadge}>Teklif verildi</span> : null}
        </div>
        <time dateTime={request.olusturmaTarihi}>{formatDate(request.olusturmaTarihi)}</time>
      </div>
      <div className={styles.requestBody}>
        {request.primaryImage ? <div className={styles.requestImage}>
          <img src={request.primaryImage.thumbnailUrl} alt="Yük fotoğrafı" />
          {typeof request.imageCount === "number" && request.imageCount > 1 ? <span>+{request.imageCount - 1}</span> : null}
        </div> : null}
        <div className={styles.requestInfo}>
          <h2><button type="button" aria-pressed={isSelected} title={request.baslangicSehri + " → " + request.varisSehri} onClick={(event) => { event.stopPropagation(); onCardClick(request.id); }} className={styles.routeButton}>
            <span>{request.baslangicSehri}</span><i className="pi pi-arrow-right" aria-hidden="true" /><span>{request.varisSehri}</span>
          </button></h2>
          {routeSubtitle ? <p className={styles.routeSubtitle} title={routeSubtitle}>{routeSubtitle}</p> : null}
          <div className={styles.cargoFacts}>
            <span>{getCargoTypeLabel(request.yukTipi)}</span>
            {request.agirlikKg !== null ? <span>{formatWeightKg(request.agirlikKg)}</span> : null}
            {request.hacimM3 !== null ? <span>{formatVolumeM3(request.hacimM3)}</span> : null}
            {request.tekTasimaIstiyor ? <span>Tek taşıma</span> : null}
          </div>
        </div>
      </div>
      {request.yukDetay ? <p className={styles.requestDescription}>{request.yukDetay}</p> : null}
      {routeCompatibility ? <div className={styles.compatDetails}><i className="pi pi-directions" aria-hidden="true" />Ek {formatRouteDistanceKm(routeCompatibility.extraMesafeMetre)} · {formatRouteDuration(routeCompatibility.extraSureSaniye)}</div> : null}
      <footer className={styles.requestFooter}>
        <div className={styles.schedule}>
          {request.tasimaTarihi ? <span><i className="pi pi-calendar" aria-hidden="true" />{formatDateOnly(request.tasimaTarihi)}</span> : null}
          {request.rotaMesafeMetre !== null ? <span>{formatRouteDistanceKm(request.rotaMesafeMetre)}</span> : null}
          {request.rotaSureSaniye !== null ? <span>{formatRouteDuration(request.rotaSureSaniye)}</span> : null}
        </div>
        <Link href={detailHref} onClick={(event) => event.stopPropagation()} className={styles.detailLink}>Detay ve teklif<i className="pi pi-arrow-up-right" aria-hidden="true" /></Link>
      </footer>
    </article>
  );
}
