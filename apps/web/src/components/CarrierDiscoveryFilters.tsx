"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import CitySelectField from "@/components/CitySelectField";
import { Button } from "@/components/ui";
import styles from "./discovery.module.css";
import type { CarrierRouteListItem } from "@/lib/api/carrier-routes";
import {
  CARGO_TYPE_OPTIONS,
  formatRouteDistanceKm,
  formatRouteDuration,
} from "@/lib/logistics";
import { formatDateOnly } from "@/lib/date-only";
import { TURKEY_CITY_OPTIONS } from "@/lib/turkey-cities";

export type CarrierDiscoveryFilterForm = {
  baslangicSehir: string;
  varisSehir: string;
  tekTasimaIstiyor: "all" | "true" | "false";
  minAgirlikKg: string;
  maxAgirlikKg: string;
  minHacimM3: string;
  maxHacimM3: string;
  yukTipi: string;
};

type CarrierDiscoveryFiltersProps = {
  resultsCount: number;
  mapAction?: ReactNode;
  selectedCarrierRouteId: string | null;
  selectedCarrierRoute: CarrierRouteListItem | null;
  routes: CarrierRouteListItem[];
  isRoutesLoading: boolean;
  routeErrorMessage: string | null;
  filters: CarrierDiscoveryFilterForm;
  filtersActive: boolean;
  maxSapmaKm: number | null;
  onFilterChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onApplyFilters: (event: FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onCarrierRouteChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBaslangicSehirChange: (value: string) => void;
  onVarisSehirChange: (value: string) => void;
  onMaxSapmaChange: (value: number) => void;
};

const MAX_SAPMA_PRESETS = [25, 50, 100, 150] as const;

export default function CarrierDiscoveryFilters({
  resultsCount,
  mapAction,
  selectedCarrierRouteId,
  selectedCarrierRoute,
  routes,
  isRoutesLoading,
  routeErrorMessage,
  filters,
  filtersActive,
  maxSapmaKm,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onCarrierRouteChange,
  onBaslangicSehirChange,
  onVarisSehirChange,
  onMaxSapmaChange,
}: CarrierDiscoveryFiltersProps) {
  const hasRouteContext = selectedCarrierRouteId !== null && selectedCarrierRoute !== null;
  const isCustomSapmaSelected =
    hasRouteContext &&
    typeof maxSapmaKm === "number" &&
    !MAX_SAPMA_PRESETS.includes(maxSapmaKm as (typeof MAX_SAPMA_PRESETS)[number]);
  const [customSapmaInput, setCustomSapmaInput] = useState("");
  const [isCustomSapmaEditorOpen, setIsCustomSapmaEditorOpen] = useState(false);
  const isCustomSapmaEditorVisible =
    hasRouteContext && (isCustomSapmaSelected || isCustomSapmaEditorOpen);
  const resolvedCustomSapmaInput =
    customSapmaInput.trim().length > 0
      ? customSapmaInput
      : !isCustomSapmaEditorOpen &&
          isCustomSapmaSelected &&
          typeof maxSapmaKm === "number"
        ? String(maxSapmaKm)
        : "";

  const parsedCustomSapmaValue = Number(resolvedCustomSapmaInput);
  const isCustomSapmaValid =
    resolvedCustomSapmaInput.trim().length > 0 &&
    Number.isFinite(parsedCustomSapmaValue) &&
    parsedCustomSapmaValue > 0;

  const handleCustomSapmaApply = () => {
    if (!hasRouteContext || !isCustomSapmaValid) {
      return;
    }

    onMaxSapmaChange(parsedCustomSapmaValue);
  };

  return (
    <section className={styles.filters} aria-label="Açık istek filtreleri">
      <div className={styles.filterHeading}><h2><i className="pi pi-sliders-h" aria-hidden="true" />Filtreler ve rota</h2>{mapAction}</div>
      <form onSubmit={onApplyFilters}>
        <div className={styles.locationFilters}>
          <CitySelectField id="baslangicSehir" label="Kalkış şehri" options={TURKEY_CITY_OPTIONS} placeholder="Tüm şehirler" value={filters.baslangicSehir} onChange={onBaslangicSehirChange} />
          <CitySelectField id="varisSehir" label="Varış şehri" options={TURKEY_CITY_OPTIONS} placeholder="Tüm şehirler" value={filters.varisSehir} onChange={onVarisSehirChange} />
          <div className={styles.filterActions}>
            <Button variant="ghost" onClick={onResetFilters}>Temizle</Button>
            <Button type="submit" variant="primary"><i className="pi pi-search" aria-hidden="true" /> Sonuçları göster</Button>
          </div>
        </div>
        <details className={styles.advancedFilters}>
          <summary><i className="pi pi-sliders-h" aria-hidden="true" /> Yük ve taşıma filtreleri <span>{filtersActive ? "Filtreler etkin" : "İsteğe bağlı"}</span><i className="pi pi-angle-down" aria-hidden="true" /></summary>
          <div className={styles.advancedGrid}>
            <label htmlFor="yukTipi">Yük tipi
              <select id="yukTipi" name="yukTipi" value={filters.yukTipi} onChange={onFilterChange} className="app-input w-full">
                <option value="">Tüm tipler</option>
                {CARGO_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor="tekTasimaIstiyor">Taşıma tercihi
              <select id="tekTasimaIstiyor" name="tekTasimaIstiyor" value={filters.tekTasimaIstiyor} onChange={onFilterChange} className="app-input w-full">
                <option value="all">Hepsi</option><option value="true">Sadece tek taşıma</option><option value="false">Paylaşımlı olabilir</option>
              </select>
            </label>
            <fieldset><legend>Ağırlık (kg)</legend><div className={styles.range}>
              <input aria-label="Minimum ağırlık (kg)" name="minAgirlikKg" type="number" min="0" step="0.01" placeholder="Min." value={filters.minAgirlikKg} onChange={onFilterChange} className="app-input" />
              <span>–</span>
              <input aria-label="Maksimum ağırlık (kg)" name="maxAgirlikKg" type="number" min="0" step="0.01" placeholder="Maks." value={filters.maxAgirlikKg} onChange={onFilterChange} className="app-input" />
            </div></fieldset>
            <fieldset><legend>Hacim (m³)</legend><div className={styles.range}>
              <input aria-label="Minimum hacim (m³)" name="minHacimM3" type="number" min="0" step="0.01" placeholder="Min." value={filters.minHacimM3} onChange={onFilterChange} className="app-input" />
              <span>–</span>
              <input aria-label="Maksimum hacim (m³)" name="maxHacimM3" type="number" min="0" step="0.01" placeholder="Maks." value={filters.maxHacimM3} onChange={onFilterChange} className="app-input" />
            </div></fieldset>
          </div>
        </details>
      </form>
      <div className={styles.routeFilters}>
        <div className={styles.savedRoute}>
          <label htmlFor="carrierRouteId"><i className="pi pi-directions" aria-hidden="true" /> Kayıtlı rota</label>
          <select id="carrierRouteId" value={selectedCarrierRouteId ?? ""} onChange={onCarrierRouteChange} disabled={isRoutesLoading || Boolean(routeErrorMessage)} className="app-input">
            <option value="">Rota seçmeden devam et</option>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.baslangicSehri} → {route.varisSehri} · {formatDateOnly(route.planlananTarih)}</option>)}
          </select>
        </div>
        <div className={styles.deviation}>
          <span title={!hasRouteContext ? "Sapma limiti için kayıtlı bir rota seçin." : undefined}>Maks. sapma</span>
          <div className={styles.deviationOptions}>
            {MAX_SAPMA_PRESETS.map((option) => (
              <button key={option} type="button" onClick={() => { setIsCustomSapmaEditorOpen(false); onMaxSapmaChange(option); }} disabled={!hasRouteContext} aria-pressed={hasRouteContext && maxSapmaKm === option} className={hasRouteContext && maxSapmaKm === option ? styles.deviationActive : ""}>{option} km</button>
            ))}
            <button type="button" disabled={!hasRouteContext} aria-pressed={isCustomSapmaSelected} onClick={() => { if (!hasRouteContext) return; setIsCustomSapmaEditorOpen(true); setCustomSapmaInput(isCustomSapmaSelected && typeof maxSapmaKm === "number" ? String(maxSapmaKm) : ""); }} className={isCustomSapmaSelected ? styles.deviationActive : ""}>Özel</button>
          </div>
        </div>
        {isCustomSapmaEditorVisible ? (
          <div className={styles.customDeviation}>
            <input aria-label="Özel sapma limiti (km)" type="number" min="1" step="1" value={resolvedCustomSapmaInput} onChange={(event) => setCustomSapmaInput(event.target.value)} placeholder="Özel km" className="app-input" />
            <Button onClick={handleCustomSapmaApply} disabled={!isCustomSapmaValid}>Uygula</Button>
          </div>
        ) : null}
      </div>
      {isRoutesLoading ? <p className={styles.filterNote}>Rotalar yükleniyor…</p> : null}
      {!isRoutesLoading && routeErrorMessage ? <p className={styles.routeError} role="alert">{routeErrorMessage}</p> : null}
      {!isRoutesLoading && !routeErrorMessage && routes.length === 0 ? <p className={styles.filterNote}>Kayıtlı rota bulunmuyor. <Link href="/dashboard/rotalarim/yeni">Yeni rota tanımla →</Link></p> : null}
      {hasRouteContext ? <p className={styles.filterNote}><strong>{selectedCarrierRoute.baslangicSehri} → {selectedCarrierRoute.varisSehri}</strong> · {formatDateOnly(selectedCarrierRoute.planlananTarih)} · {formatRouteDistanceKm(selectedCarrierRoute.rotaMesafeMetre)} · {formatRouteDuration(selectedCarrierRoute.rotaSureSaniye)}</p> : null}
      <span className={styles.srOnly}>{resultsCount} talep</span>
    </section>
  );
}
