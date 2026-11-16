"use client";

import type { CSSProperties, ReactNode } from "react";
import { Button, EmptyState, InlineNotice, MetricCard, Surface, TextField } from "@/components/ui";
import { formatTransportRouteLabel } from "@/lib/logistics";
import styles from "./workspace.module.css";

export type LoadState = { isLoading: boolean; errorMessage: string | null };

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

// Presentation only. Identifiers in API payloads and links are left untouched.
export function displayText(value: string | null | undefined, fallback = "") {
  return (value ?? "").replace(UUID, "").replace(/#(?=\s|$)/g, "").replace(/[ \t]{2,}/g, " ").trim() || fallback;
}

export function routeLabel(origin: string | null, destination: string | null, cargoType?: string) {
  return formatTransportRouteLabel({ origin: displayText(origin), destination: displayText(destination), cargoType });
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
}

export function formatTimestamp(value: string | null) {
  if (!value) return "Henüz hareket yok";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function offerStatus(value: string) {
  switch (value.trim().toUpperCase()) {
    case "OLUSTURULDU": return { label: "Karar bekliyor", tone: "blue" as const };
    case "KABUL_EDILDI": return { label: "Kabul edildi", tone: "green" as const };
    case "REDDEDILDI": return { label: "Reddedildi", tone: "red" as const };
    case "IPTAL_EDILDI": return { label: "İptal edildi", tone: "neutral" as const };
    default: return { label: displayText(value, "Teklif"), tone: "neutral" as const };
  }
}

export function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div className={styles.loading} role="status" aria-busy="true" aria-label={label}>
      <span className={styles.loadingLabel}>{label}</span>
      <div className={styles.skeletonSummary} />
      <Surface padding="none" className={styles.skeletonList}>
        {[0, 1, 2].map((item) => <div key={item} className={styles.skeletonRow} />)}
      </Surface>
    </div>
  );
}

export function LoadFeedback({ isLoading, errorMessage, label }: LoadState & { label: string }) {
  if (isLoading) return <WorkspaceLoading label={label} />;
  const messages: Record<string, string> = {
    "Gelen teklifler yuklenirken beklenmeyen bir hata olustu.": "Gelen teklifler yüklenirken beklenmeyen bir hata oluştu.",
    "Konusmalar yuklenirken beklenmeyen bir hata olustu.": "Konuşmalar yüklenirken beklenmeyen bir hata oluştu.",
    "Puanlar yuklenirken beklenmeyen bir hata olustu.": "Puanlar yüklenirken beklenmeyen bir hata oluştu.",
    "Bildirimler yuklenirken beklenmeyen bir hata olustu.": "Bildirimler yüklenirken beklenmeyen bir hata oluştu.",
    "Profil ozeti yuklenirken beklenmeyen bir hata olustu.": "Profil özeti yüklenirken beklenmeyen bir hata oluştu.",
  };
  if (errorMessage) return <InlineNotice tone="red" title="Bilgiler yüklenemedi">{displayText(messages[errorMessage] ?? errorMessage)}</InlineNotice>;
  return null;
}

export function SummaryStrip({ items }: {
  items: ReadonlyArray<{ label: string; value: number | string; description: string; icon?: string }>;
}) {
  return (
    <div className={styles.summaryStrip} data-dashboard-stats style={{ "--summary-columns": items.length } as CSSProperties}>
      {items.map(({ icon, ...item }) => <MetricCard key={item.label} {...item} icon={icon ? <i className={icon} /> : undefined} />)}
    </div>
  );
}

export function Panel({ title, description, action, icon, children, className = "" }: {
  title: string; description?: string; action?: ReactNode; icon?: string; children: ReactNode; className?: string;
}) {
  return (
    <Surface padding="none" className={[styles.panel, className].join(" ")}>
      <header className={styles.panelHeader}>
        <div><h2>{icon ? <i className={icon} aria-hidden="true" /> : null}{title}</h2>{description ? <p>{description}</p> : null}</div>
        {action ? <div className={styles.panelAction}>{action}</div> : null}
      </header>
      {children}
    </Surface>
  );
}

export function FilterBar<T extends string>({
  filters, selected, onSelect, query, onQueryChange, searchLabel, placeholder,
}: {
  filters: ReadonlyArray<{ id: T; label: string; count?: number }>;
  selected: T; onSelect: (value: T) => void;
  query?: string; onQueryChange?: (value: string) => void; searchLabel?: string; placeholder?: string;
}) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterTabs} role="group" aria-label="Liste filtresi">
        {filters.map((filter) => (
          <button type="button" key={filter.id} aria-pressed={selected === filter.id} onClick={() => onSelect(filter.id)}>
            {filter.label}{filter.count !== undefined ? <span>{filter.count}</span> : null}
          </button>
        ))}
      </div>
      {onQueryChange ? (
        <div className={styles.search}>
          <TextField type="search" label={searchLabel ?? "Listede ara"} hideLabel
            leadingIcon={<i className="pi pi-search" />} placeholder={placeholder}
            value={query ?? ""} onChange={(event) => onQueryChange(event.target.value)} />
        </div>
      ) : null}
    </div>
  );
}

export function NoFilterResults({ onReset }: { onReset: () => void }) {
  return <EmptyState icon="pi pi-search" title="Sonuç bulunamadı" description="Arama metnini veya seçili filtreyi değiştirerek tekrar deneyin."
    action={<Button onClick={onReset}>Filtreleri temizle</Button>} />;
}

export function RatingScore({ value }: { value: number | null }) {
  return (
    <div className={styles.ratingScore} aria-label={value === null ? "Henüz puan yok" : value + " / 5 puan"}>
      <span className={styles.stars} aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={styles.star}>
          <i className="pi pi-star" />
          <span style={{ width: Math.max(0, Math.min(1, (value ?? 0) - i)) * 100 + "%" }}><i className="pi pi-star-fill" /></span>
        </span>
      ))}</span>
      <strong>{value === null ? "—" : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(value)}<small> / 5</small></strong>
    </div>
  );
}
