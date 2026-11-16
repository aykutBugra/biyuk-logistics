"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { displayText, FilterBar, LoadFeedback, type LoadState, NoFilterResults, Panel, SummaryStrip } from "@/features/customer-workspace/shared";
import styles from "./workspace.module.css";

export type SummaryItem = { label: string; value: number | string; description: string; icon?: string };
export type OfferFilter = "all" | "open" | "accepted" | "rejected" | "negotiation";
export type OfferSort = "newest" | "oldest" | "price-desc" | "price-asc";
export type ShipmentFilter = "all" | "active" | "on-road" | "completed";
export type ShipmentSort = "newest" | "oldest" | "delivery-soon";
export type RouteFilter = "all" | "distance-ready" | "coordinate-ready" | "incomplete";
export type RouteSort = "newest" | "oldest" | "distance-desc" | "distance-asc";

export function carrierText(value: string | null | undefined, fallback = "") {
  const text = displayText(value, fallback).replace(/\s*->\s*/g, " → ");
  const labels: Record<string, string> = {
    "Musait": "Müsait", "Tek tasima": "Tek taşıma", "Hazirlaniyor": "Hazırlanıyor",
    "Musteri onayi bekliyor": "Müşteri onayı bekliyor", "Yanit bekliyor": "Yanıt bekliyor",
    "Muzakere acik": "Görüşme devam ediyor", "Koordinat hazir": "Koordinatlar hazır",
    "Mesafe hazir": "Mesafe hesaplı", "Kesif ozeti hazirlaniyor": "Yük eşleşmeleri yükleniyor…",
    "Rezerve agirlik": "Rezerve ağırlık", "Kalan agirlik": "Kalan ağırlık",
    "Rezerve hacim": "Rezerve hacim", "Kalan hacim": "Kalan hacim",
    "Aktif rezervasyon": "Aktif rezervasyon", "Tek tasima rezerv.": "Tek taşıma rezervasyonu",
    "Teslim onayi": "Teslim onayı",
    "Kapasite ozeti eksik kayitlar nedeniyle yaklasik gosteriliyor.": "Eksik kayıtlar nedeniyle kapasite özeti yaklaşık gösteriliyor.",
    "Planlanan teslim tarihi gecti. Detay sayfasindan operasyonu ve musteri ile iletisimi kontrol et.": "Planlanan teslim tarihi geçti. Nakliye detayından operasyonu ve müşteriyle iletişimi kontrol edin.",
    "Yuk sahada ilerliyor. Teslim sureci aktif olarak devam ediyor.": "Taşıma devam ediyor. Teslimat adımlarını nakliye detayından takip edebilirsiniz.",
    "Teslim edildi, musteri onayi bekleniyor.": "Teslimat bildirildi; müşteri onayı bekleniyor.",
    "Teslimat basariyla tamamlandi ve kayit kapanisa hazir.": "Taşıma tamamlandı.",
    "Teklif kabul edildi. Cikis ve operasyon hazirligi devam ediyor.": "Teklif kabul edildi. Çıkış ve operasyon hazırlığı devam ediyor.",
  };
  return labels[text] ?? text.replace(/^Arac:/, "Araç:").replace(/ uygun acik istek$/, " uygun açık istek");
}

export function carrierTone(value: "emerald" | "blue" | "amber" | "rose" | "slate") {
  return value === "emerald" ? "green" : value === "rose" ? "red" : value === "slate" ? "neutral" : value;
}

export function shipmentState(value: string) {
  switch (value.trim().toUpperCase()) {
    case "OLUSTURULDU": return { label: "Hazırlanıyor", tone: "amber" as const };
    case "BASLATILDI": return { label: "Yolda", tone: "blue" as const };
    case "TESLIM_BEKLIYOR": return { label: "Müşteri onayı bekliyor", tone: "amber" as const };
    case "TAMAMLANDI": return { label: "Tamamlandı", tone: "green" as const };
    default: return { label: carrierText(value), tone: "neutral" as const };
  }
}

export function CarrierFeedback(props: LoadState & { label: string }) {
  const messages: Record<string, string> = {
    "Teklifler yuklenirken beklenmeyen bir hata olustu.": "Teklifler yüklenirken beklenmeyen bir hata oluştu.",
    "Nakliyeler yuklenirken beklenmeyen bir hata olustu.": "Nakliyeler yüklenirken beklenmeyen bir hata oluştu.",
    "Rotalar yuklenirken beklenmeyen bir hata olustu.": "Rotalar yüklenirken beklenmeyen bir hata oluştu.",
    "Araclar yuklenirken beklenmeyen bir hata olustu.": "Araçlar yüklenirken beklenmeyen bir hata oluştu.",
    "Genel bakis yuklenirken beklenmeyen bir hata olustu.": "Genel bakış yüklenirken beklenmeyen bir hata oluştu.",
  };
  return <LoadFeedback {...props} errorMessage={props.errorMessage ? messages[props.errorMessage] ?? props.errorMessage : null} />;
}

export function CarrierMetrics({ items }: { items: SummaryItem[] }) {
  const iconFor = (label: string) => /rota|mesafe/i.test(label) ? "pi pi-map" : /araç|filo|rezerv|nakliye|taşıma/i.test(label) ? "pi pi-truck" : /tamam|kabul/i.test(label) ? "pi pi-check-circle" : /teklif|yanıt|görüş/i.test(label) ? "pi pi-send" : "pi pi-box";
  return <div className={styles.metrics}><SummaryStrip items={items.map((item) => ({ ...item, icon: item.icon ?? iconFor(item.label) }))} /></div>;
}

export type ListControls<F extends string, S extends string> = {
  query: string; filter: F; sort: S;
  onQueryChange: (value: string) => void; onFilterChange: (value: F) => void; onSortChange: (value: S) => void;
  onReset: () => void;
};

export function CarrierListLayout<F extends string, S extends string>({
  isLoading, errorMessage, title, description, loadingLabel, metrics, filters, sortOptions, query, filter, sort,
  onQueryChange, onFilterChange, onSortChange, onReset, searchLabel, placeholder, totalCount, visibleCount,
  isEnriching = false, emptyState, children, priorityContent,
}: LoadState & ListControls<F, S> & {
  title: string; description: string; loadingLabel: string; metrics: SummaryItem[];
  filters: Array<{ id: F; label: string; count?: number }>; sortOptions: Array<{ value: S; label: string }>;
  searchLabel: string; placeholder: string; totalCount: number; visibleCount: number; isEnriching?: boolean;
  emptyState: ReactNode; children: ReactNode; priorityContent?: ReactNode;
}) {
  if (isLoading || errorMessage) return <CarrierFeedback isLoading={isLoading} errorMessage={errorMessage} label={loadingLabel} />;
  return (
    <div className={styles.workspace}>
      <CarrierMetrics items={metrics} />
      {priorityContent}
      <Panel className={styles.listPanel} title={title} icon={/araç/i.test(title) ? "pi pi-truck" : /rota/i.test(title) ? "pi pi-map" : /nakliye/i.test(title) ? "pi pi-truck" : "pi pi-send"} description={description} action={
        <label className={styles.sort}><span>Sıralama</span><select aria-label="Liste sıralaması" value={sort} onChange={(event) => onSortChange(event.target.value as S)}>
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
      }>
        <FilterBar filters={filters} selected={filter} onSelect={onFilterChange} query={query} onQueryChange={onQueryChange} searchLabel={searchLabel} placeholder={placeholder} />
        <div className={styles.listMeta}><span>{visibleCount} / {totalCount} kayıt</span>{isEnriching ? <Badge tone="blue">Ek bilgiler yükleniyor…</Badge> : null}</div>
        {!totalCount ? emptyState : !visibleCount ? <NoFilterResults onReset={onReset} /> : <div className={styles.list}>{children}</div>}
      </Panel>
    </div>
  );
}
