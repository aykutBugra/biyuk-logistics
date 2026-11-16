"use client";

import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { MyOfferCardModel } from "@/components/MyOfferCard";
import { formatMoney, offerStatus, type LoadState } from "@/features/customer-workspace/shared";
import { CarrierListLayout, carrierText, type ListControls, type OfferFilter, type OfferSort, type SummaryItem } from "./shared";
import styles from "./workspace.module.css";

type OfferRow = MyOfferCardModel & { isNegotiation: boolean };

export default function OffersWorkspace({
  items, metrics, totalCount, isEnriching, ...controls
}: LoadState & ListControls<OfferFilter, OfferSort> & {
  items: OfferRow[]; metrics: SummaryItem[]; totalCount: number; isEnriching: boolean;
}) {
  return (
    <CarrierListLayout {...controls} metrics={metrics} totalCount={totalCount} visibleCount={items.length} isEnriching={isEnriching}
      title="Teklif listesi" description="Talep, müşteri ve görüşme bilgileriyle tekliflerinizi takip edin."
      loadingLabel="Teklifler yükleniyor…" searchLabel="Tekliflerde ara" placeholder="Güzergâh, müşteri veya yük ara…"
      filters={[{ id: "all", label: "Tümü" }, { id: "open", label: "Bekleyen" }, { id: "accepted", label: "Kabul edilen" }, { id: "rejected", label: "Reddedilen / iptal" }, { id: "negotiation", label: "Görüşülen" }]}
      sortOptions={[{ value: "newest", label: "Mevcut sıra" }, { value: "oldest", label: "Ters sıra" }, { value: "price-desc", label: "Tutar: yüksekten" }, { value: "price-asc", label: "Tutar: düşükten" }]}
      emptyState={<EmptyState title="Henüz teklif yok" description="Açık istekleri inceleyip ilk teklifinizi verdiğinizde burada listelenecek." action={<LinkButton href="/dashboard/acik_istekler" variant="primary">Açık istekleri incele</LinkButton>} />}
    >
      {items.map((offer) => {
        const state = offerStatus(offer.durum);
        const route = carrierText(offer.rotaBaslik, "Taşıma talebi");
        return (
          <article key={offer.id} data-dashboard-card className={[styles.row, offer.hasUnread ? styles.unreadRow : ""].join(" ")}>
            <div className={styles.rowTop}>
              <div className={styles.routeHeading}>
                <div className={styles.badges}><Badge tone={state.tone}>{state.label}</Badge>{offer.hasUnread ? <Badge tone="blue">Yeni mesaj</Badge> : offer.isNegotiation ? <span>Görüşme devam ediyor</span> : null}</div>
                <h3 title={route}>{route}</h3>
                {offer.rotaMeta ? <p className={styles.address} title={carrierText(offer.rotaMeta)}>{carrierText(offer.rotaMeta)}</p> : null}
              </div>
              <strong className={styles.price}>{formatMoney(offer.fiyat)}</strong>
            </div>
            <div className={styles.offerContent}>
              <div className={styles.identity}>
                <CustomerInitialsAvatar name={carrierText(offer.musteriAdi)} fallback={carrierText(offer.musteriKullaniciAdi, "M")} imageUrl={offer.musteriProfileImageUrl} size="xs" />
                <div><strong>{carrierText(offer.musteriAdi, "Müşteri bilgisi paylaşılmadı")}</strong>{offer.musteriKullaniciAdi ? <span>@{carrierText(offer.musteriKullaniciAdi)}</span> : null}</div>
              </div>
              <dl className={styles.dates}>
                <div><dt>Planlanan alım</dt><dd>{offer.planlananAlimTarihi || "Belirtilmedi"}</dd></div>
                <div><dt>Tahmini teslim</dt><dd>{offer.tahminiTeslimTarihi || "Belirtilmedi"}</dd></div>
                <div><dt>Araç</dt><dd>{carrierText(offer.aracPlaka, "Belirtilmedi")}</dd></div>
              </dl>
            </div>
            {offer.chipler.length ? <div className={styles.facts}>{offer.chipler.map((chip) => <span key={chip.label}>{carrierText(chip.label)}</span>)}</div> : null}
            {offer.sonHareketAciklamasi || offer.not ? <p className={styles.note}>{carrierText(offer.sonHareketAciklamasi ?? offer.not)}</p> : null}
            <footer className={styles.rowFooter}>
              <span className={styles.updated}>{offer.sonHareketTarihi ? "Son hareket: " + offer.sonHareketTarihi : "Henüz görüşme hareketi yok"}</span>
              <div className={styles.actions}>
                <LinkButton href={offer.detailHref} variant="ghost">Talep detayı</LinkButton>
                <LinkButton href={offer.conversationHref}>Konuşmayı aç <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
              </div>
            </footer>
          </article>
        );
      })}
    </CarrierListLayout>
  );
}
