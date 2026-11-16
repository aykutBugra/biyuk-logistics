"use client";

import { useState } from "react";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import { Badge, Button, EmptyState, LinkButton } from "@/components/ui";
import type { MyIncomingOfferItem } from "@/lib/api/offers";
import { formatDateOnly } from "@/lib/date-only";
import { formatVolumeM3, formatWeightKg, getCargoTypeLabel } from "@/lib/logistics";
import { displayText, FilterBar, formatMoney, LoadFeedback, type LoadState, NoFilterResults, offerStatus, Panel, routeLabel, SummaryStrip } from "./shared";
import styles from "./workspace.module.css";

type OfferFilter = "all" | "OLUSTURULDU" | "KABUL_EDILDI" | "REDDEDILDI" | "IPTAL_EDILDI";

export default function IncomingOffersWorkspace({
  offers, isLoading, errorMessage, actingOfferId, onDecision,
}: LoadState & {
  offers: MyIncomingOfferItem[];
  actingOfferId: string | null;
  onDecision: (offer: MyIncomingOfferItem, action: "accept" | "reject") => void;
}) {
  const [filter, setFilter] = useState<OfferFilter>("all");
  const status = (offer: MyIncomingOfferItem) => offer.durum.trim().toUpperCase();
  const count = (value: OfferFilter) => value === "all" ? offers.length : offers.filter((offer) => status(offer) === value).length;
  const visibleOffers = offers.filter((offer) => filter === "all" || status(offer) === filter);
  const filters: Array<{ id: OfferFilter; label: string; count: number }> = [
    { id: "all", label: "Tümü", count: offers.length },
    { id: "OLUSTURULDU", label: "Karar bekleyen", count: count("OLUSTURULDU") },
    { id: "KABUL_EDILDI", label: "Kabul edilen", count: count("KABUL_EDILDI") },
    { id: "REDDEDILDI", label: "Reddedilen", count: count("REDDEDILDI") },
    ...(count("IPTAL_EDILDI") > 0 ? [{ id: "IPTAL_EDILDI" as const, label: "İptal edilen", count: count("IPTAL_EDILDI") }] : []),
  ];

  if (isLoading || errorMessage) return <LoadFeedback isLoading={isLoading} errorMessage={errorMessage} label="Teklifler yükleniyor…" />;

  return (
    <div className={styles.workspace}>
      <SummaryStrip items={[
        { label: "Karar bekleyen", value: count("OLUSTURULDU"), description: "Yanıtınızı bekleyen teklifler", icon: "pi pi-send" },
        { label: "Toplam teklif", value: offers.length, description: "Tüm taşıma talepleriniz için", icon: "pi pi-wallet" },
        { label: "Kabul edilen", value: count("KABUL_EDILDI"), description: "Anlaşmaya vardığınız teklifler", icon: "pi pi-check-circle" },
      ]} />
      <Panel title="Teklif listesi" icon="pi pi-send" description="Mesaj ve karşı teklif için ilgili konuşmayı açabilirsiniz.">
        <FilterBar filters={filters} selected={filter} onSelect={setFilter} />
        {!offers.length ? <EmptyState title="Henüz teklif yok" description="Nakliyecilerden teklif geldiğinde burada listelenecek."
          action={<LinkButton href="/dashboard/isteklerim">İsteklerime git</LinkButton>} />
        : !visibleOffers.length ? <NoFilterResults onReset={() => setFilter("all")} />
        : <div className={styles.list}>{visibleOffers.map((offer) => {
          const state = offerStatus(offer.durum);
          const canDecide = status(offer) === "OLUSTURULDU";
          const route = routeLabel(offer.baslangicSehri, offer.varisSehri, offer.yukTipi);
          const busy = actingOfferId === offer.id;
          return (
            <article key={offer.id} className={styles.offerRow} data-dashboard-card aria-busy={busy || undefined}>
              <div className={styles.offerMain}>
                <div className={styles.identity}>
                  <CustomerInitialsAvatar name={displayText(offer.carrierName)} fallback={displayText(offer.carrierUsername)} imageUrl={offer.carrierProfileImageUrl} size="sm" className={styles.avatar} />
                  <div className={styles.identityText}>
                    <h3>{displayText(offer.carrierName, "Nakliyeci")}</h3>
                    <span>@{displayText(offer.carrierUsername)}</span>
                  </div>
                </div>
                <div className={styles.offerAmount}><strong>{formatMoney(offer.fiyat)}</strong><Badge tone={state.tone}>{state.label}</Badge></div>
              </div>
              <h4 className={styles.route} title={route}>{route}</h4>
              <div className={styles.factsLine}>
                <span>{getCargoTypeLabel(offer.yukTipi)}</span>
                {offer.agirlikKg !== null ? <span>{formatWeightKg(offer.agirlikKg)}</span> : null}
                {offer.hacimM3 !== null ? <span>{formatVolumeM3(offer.hacimM3)}</span> : null}
                {offer.tekTasimaIstiyor ? <span>Tek taşıma</span> : null}
              </div>
              {offer.not ? <p className={styles.messageText}>{displayText(offer.not)}</p> : null}
              <div className={styles.offerBottom}>
                <dl className={styles.dates}>
                  <div><dt>Planlanan alım</dt><dd>{formatDateOnly(offer.planlananAlimTarihi)}</dd></div>
                  <div><dt>Tahmini teslim</dt><dd>{formatDateOnly(offer.tahminiTeslimTarihi)}</dd></div>
                </dl>
                <div className={styles.rowActions}>
                  <LinkButton href={"/dashboard/isteklerim/" + offer.requestId} variant="ghost">İstek detayı</LinkButton>
                  <LinkButton href={"/dashboard/konusmalar/teklif/" + offer.id}>{canDecide ? "Mesaj ve karşı teklif" : "Konuşmayı aç"}</LinkButton>
                  {canDecide ? <>
                    <Button variant="danger" disabled={actingOfferId !== null} onClick={() => onDecision(offer, "reject")}>Reddet</Button>
                    <Button variant="primary" disabled={actingOfferId !== null} loading={busy} onClick={() => onDecision(offer, "accept")}>Kabul et</Button>
                  </> : null}
                </div>
              </div>
            </article>
          );
        })}</div>}
      </Panel>
    </div>
  );
}
