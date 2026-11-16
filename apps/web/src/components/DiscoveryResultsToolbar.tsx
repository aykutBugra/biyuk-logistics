"use client";

import styles from "./discovery.module.css";
import { Button } from "@/components/ui";

export type DiscoverySortMode = "recommended" | "newest";
type DiscoveryResultsToolbarProps = {
  resultsCount: number;
  sortMode: DiscoverySortMode;
  onSortModeChange: (value: DiscoverySortMode) => void;
  isMapVisible: boolean;
  onMapToggle: () => void;
  hasRouteContext: boolean;
  activeFilterLabel?: string;
  showMapToggle?: boolean;
};

export default function DiscoveryResultsToolbar({
  resultsCount, sortMode, onSortModeChange, isMapVisible, onMapToggle, hasRouteContext, activeFilterLabel, showMapToggle = true,
}: DiscoveryResultsToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Arama sonuçları">
      <div className={styles.resultsHeading}>
        <h2>Açık taşıma talepleri <span className={styles.resultCount}>{resultsCount}</span></h2>
        <p>{activeFilterLabel || (hasRouteContext ? "Seçili rota ve sapma limitine göre" : "Güncel taşıma talepleri")}</p>
      </div>
      <div className={styles.toolbarActions}>
        <label className={styles.sort}><span className={styles.srOnly}>Sıralama</span>
          <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as DiscoverySortMode)}>
            <option value="recommended">En uygun</option><option value="newest">En yeni</option>
          </select>
        </label>
        {showMapToggle ? <Button onClick={onMapToggle} aria-pressed={isMapVisible} aria-controls="open-requests-map">
          <i className="pi pi-map" aria-hidden="true" />{isMapVisible ? "Haritayı gizle" : "Haritayı göster"}
        </Button> : null}
      </div>
    </section>
  );
}
