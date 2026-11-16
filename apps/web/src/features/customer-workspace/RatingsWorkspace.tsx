"use client";

import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { MyRatingSummary, RatingListItem } from "@/lib/api/ratings";
import { displayText, FilterBar, formatTimestamp, LoadFeedback, type LoadState, NoFilterResults, Panel, RatingScore, routeLabel, SummaryStrip } from "./shared";
import styles from "./workspace.module.css";

type RatingFilter = "all" | "given" | "received";
type RatingEntry = {
  direction: "given" | "received";
  item: RatingListItem;
  detail: { href: string; label: string };
};

export default function RatingsWorkspace({
  givenCount, receivedCount, summary, items, filter, onFilterChange, isLoading, errorMessage, emptyHref = "/dashboard/isteklerim",
}: LoadState & {
  givenCount: number; receivedCount: number; summary: MyRatingSummary;
  items: RatingEntry[]; filter: RatingFilter; onFilterChange: (value: RatingFilter) => void;
  emptyHref?: string;
}) {
  if (isLoading || errorMessage) return <LoadFeedback isLoading={isLoading} errorMessage={errorMessage} label="Değerlendirmeler yükleniyor…" />;
  const average = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value) + " / 5";
  return (
    <div className={styles.workspace}>
      <SummaryStrip items={[
        { label: "Talep sahibi olarak", value: average(summary.asCustomer.averageRating), description: summary.asCustomer.ratingCount + " değerlendirme", icon: "pi pi-user" },
        { label: "Nakliyeci olarak", value: average(summary.asCarrier.averageRating), description: summary.asCarrier.ratingCount + " değerlendirme", icon: "pi pi-truck" },
        { label: "Aldığım değerlendirme", value: receivedCount, description: "Hesabınıza gelen tüm puanlar", icon: "pi pi-star" },
        { label: "Verdiğim değerlendirme", value: givenCount, description: "Yaptığınız tüm değerlendirmeler", icon: "pi pi-send" },
      ]} />
      <Panel title="Değerlendirmeler" icon="pi pi-star" description="Verdiğiniz ve aldığınız puanlar, yorumlar ve ilgili taşıma kayıtları.">
        <FilterBar filters={[
          { id: "all", label: "Tümü", count: givenCount + receivedCount },
          { id: "received", label: "Aldığım", count: receivedCount },
          { id: "given", label: "Verdiğim", count: givenCount },
        ]} selected={filter} onSelect={onFilterChange} />
        {!givenCount && !receivedCount ? <EmptyState icon="pi pi-star" title="Henüz değerlendirme yok" description="Taşımalar tamamlandıkça verdiğiniz ve aldığınız puanlar burada görünecek."
          action={<LinkButton href={emptyHref}>Taşıma kayıtlarına git</LinkButton>} />
        : !items.length ? <NoFilterResults onReset={() => onFilterChange("all")} />
        : <div className={styles.list}>{items.map(({ item, direction, detail }) => {
          const route = routeLabel(item.baslangicSehri, item.varisSehri);
          return (
            <article key={direction + "-" + item.id} className={styles.ratingRow} data-dashboard-card>
              <div className={styles.ratingMain}>
                <div className={styles.identity}>
                  <CustomerInitialsAvatar name={displayText(item.counterpartyName)} fallback={displayText(item.counterpartyUsername)} size="sm" className={styles.avatar} tone={direction === "received" ? "amber" : "blue"} />
                  <div className={styles.identityText}>
                    <h3>{displayText(item.counterpartyName, "Kullanıcı")}</h3>
                    <span>@{displayText(item.counterpartyUsername)}</span>
                  </div>
                </div>
                <RatingScore value={item.puanDegeri} />
              </div>
              <div className={styles.ratingContext}>
                <Badge tone={direction === "received" ? "green" : "blue"}>{direction === "received" ? "Aldığım" : "Verdiğim"}</Badge>
                <span>Değerlendirilen taraf: {item.rolBaglami.trim().toUpperCase() === "NAKLIYECI" ? "Nakliyeci" : "Talep sahibi"}</span>
                <span className={styles.routeSmall} title={route}>{route}</span>
              </div>
              <p className={styles.reviewText}>{displayText(item.yorum, "Bu değerlendirmeye yorum eklenmedi.")}</p>
              <footer className={styles.ratingFooter}>
                <time dateTime={item.tarih}>{formatTimestamp(item.tarih)}</time>
                <LinkButton href={detail.href} variant="ghost">{detail.label === "Istek detayi" ? "Talep detayı" : detail.label === "Nakliye detayi" ? "Nakliye detayı" : displayText(detail.label)} <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
              </footer>
            </article>
          );
        })}</div>}
      </Panel>
    </div>
  );
}
