"use client";

import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";
import { Badge, Button, LinkButton, Surface } from "@/components/ui";
import type { TransportRequestListItem } from "@/lib/api/transport-requests";
import { formatDateOnly } from "@/lib/date-only";
import { formatTransportRouteLabel, formatVolumeM3, formatWeightKg, getCargoTypeLabel } from "@/lib/logistics";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";
import { getRequestStatusLabel } from "../request-list-model";
import styles from "./requests.module.css";

type RequestCardProps = {
  request: TransportRequestListItem;
  offerCount?: number;
  isDeleting: boolean;
  onDelete: () => void;
};

export default function RequestCard({ request, offerCount = 0, isDeleting, onDelete }: RequestCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>({ disabled: isDeleting });
  const photoCount = Math.max(0, request.imageCount ?? 0);
  const routeLabel = formatTransportRouteLabel({
    origin: request.baslangicSehri,
    destination: request.varisSehri,
    cargoType: request.yukTipi,
  });
  const createdAt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(request.olusturmaTarihi));

  return (
    <article ref={elementRef} {...motionProps} data-dashboard-card aria-busy={isDeleting || undefined}>
      <Surface padding="none" className={styles.requestCard}>
        <div className={styles.cardMain}>
          <div className={styles.thumbnail}>
            {request.primaryImage ? (
              <Image
                src={request.primaryImage.thumbnailUrl}
                alt="Taşıma talebine ait yük fotoğrafı"
                width={80}
                height={80}
                sizes="80px"
                unoptimized
              />
            ) : <i className="pi pi-box" aria-hidden="true" />}
            {photoCount > (request.primaryImage ? 1 : 0) ? (
              <span className={styles.imageCount}>{request.primaryImage ? `+${photoCount - 1}` : `${photoCount} fotoğraf`}</span>
            ) : null}
          </div>

          <div className={styles.cardContent}>
            <div className={styles.cardBadges}>
              <StatusBadge status={request.durum} label={getRequestStatusLabel(request.durum)} />
                <Badge tone={offerCount > 0 ? "green" : "neutral"}>
                  {offerCount > 0 ? `${offerCount} teklif` : "Henüz teklif yok"}
                </Badge>
              {request.tekTasimaIstiyor ? <Badge tone="amber">Tek taşıma</Badge> : null}
            </div>
            <h3 className={styles.routeTitle} title={routeLabel}>{routeLabel}</h3>
            {request.yukDetay ? <p className={styles.cargoDescription}>{request.yukDetay}</p> : null}
          </div>
          <time className={styles.createdAt} dateTime={request.olusturmaTarihi} title="Oluşturulma tarihi">{createdAt}</time>
        </div>

        <div className={styles.cardFooter}>
          <dl className={styles.facts}>
            <div><dt>Yük türü</dt><dd>{getCargoTypeLabel(request.yukTipi)}</dd></div>
            {request.agirlikKg !== null ? <div><dt>Ağırlık</dt><dd>{formatWeightKg(request.agirlikKg)}</dd></div> : null}
            {request.hacimM3 !== null ? <div><dt>Hacim</dt><dd>{formatVolumeM3(request.hacimM3)}</dd></div> : null}
            {request.tasimaTarihi ? <div><dt>Tercih edilen tarih</dt><dd>{formatDateOnly(request.tasimaTarihi)}</dd></div> : null}
          </dl>
          <div className={styles.cardActions}>
            <LinkButton href={`/dashboard/isteklerim/${request.id}`}>
              Detay <i className="pi pi-arrow-up-right" aria-hidden="true" />
            </LinkButton>
            <LinkButton href={`/dashboard/isteklerim/${request.id}/duzenle`} variant="ghost">Düzenle</LinkButton>
            <Button variant="danger" onClick={onDelete} loading={isDeleting}>
              {isDeleting ? "Siliniyor…" : "Sil"}
            </Button>
          </div>
        </div>
      </Surface>
    </article>
  );
}
