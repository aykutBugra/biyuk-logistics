"use client";

import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";
import CitySelectField from "@/components/CitySelectField";
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
    <aside className="space-y-4 lg:sticky lg:top-[calc(var(--topbar-height)+0.85rem)]">
      <section className="app-surface rounded-[1.25rem] border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Kesif paneli
            </p>
            <h2 className="text-base font-black tracking-tight text-slate-950 md:text-lg">
              Filtreler
            </h2>
            <p className="text-sm leading-5 text-slate-600">
              Rota secip sonucu canli sapma limitiyle daralt.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {resultsCount} talep
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Rota secimi
                </p>
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="carrierRouteId"
                >
                  Kayitli rota
                </label>
              </div>

              <select
                id="carrierRouteId"
                value={selectedCarrierRouteId ?? ""}
                onChange={onCarrierRouteChange}
                disabled={isRoutesLoading || Boolean(routeErrorMessage)}
                className="app-input w-full"
              >
                <option value="">Rota secmeden devam et</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.baslangicSehri} - {route.varisSehri} - {route.planlananTarih}
                  </option>
                ))}
              </select>

              {isRoutesLoading ? (
                <p className="text-sm text-slate-500">Rotalar yukleniyor...</p>
              ) : null}

              {!isRoutesLoading && routeErrorMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {routeErrorMessage}
                </div>
              ) : null}

              {!isRoutesLoading && !routeErrorMessage && routes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">
                  Kayitli rota bulunmuyor.{" "}
                  <Link
                    href="/dashboard/rotalarim/yeni"
                    className="font-semibold text-blue-700 transition hover:text-blue-800"
                  >
                    Yeni rota tanimla
                  </Link>
                </div>
              ) : null}

              {hasRouteContext ? (
                <div className="rounded-[0.95rem] border border-blue-100 bg-blue-50/70 px-3.5 py-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Secili rota
                    </p>
                    <p className="text-sm font-semibold text-slate-950">
                      {selectedCarrierRoute.baslangicSehri} - {selectedCarrierRoute.varisSehri}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                        {formatDateOnly(selectedCarrierRoute.planlananTarih)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                        {formatRouteDistanceKm(selectedCarrierRoute.rotaMesafeMetre)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                        {formatRouteDuration(selectedCarrierRoute.rotaSureSaniye)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                className={`rounded-[0.95rem] border px-3.5 py-3 ${
                  hasRouteContext
                    ? "border-slate-200 bg-white"
                    : "border-dashed border-slate-300 bg-white/80"
                }`}
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Sapma limiti
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    Maksimum sapma mesafesi
                  </p>
                  <p className="text-xs leading-5 text-slate-500">
                    {hasRouteContext
                      ? "Secili rota icin uygun talepler bu backend filtresine gore listelenir."
                      : "Sapma limiti kullanmak icin once kayitli rota sec."}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {MAX_SAPMA_PRESETS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setIsCustomSapmaEditorOpen(false);
                        onMaxSapmaChange(option);
                      }}
                      disabled={!hasRouteContext}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        maxSapmaKm === option
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      }`}
                    >
                      {option} km
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasRouteContext) {
                        return;
                      }

                      setIsCustomSapmaEditorOpen(true);
                      setCustomSapmaInput(
                        isCustomSapmaSelected && typeof maxSapmaKm === "number"
                          ? String(maxSapmaKm)
                          : ""
                      );
                    }}
                    disabled={!hasRouteContext}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isCustomSapmaSelected
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    }`}
                  >
                    Ozel
                  </button>
                </div>

                {isCustomSapmaEditorVisible ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={resolvedCustomSapmaInput}
                      onChange={(event) => setCustomSapmaInput(event.target.value)}
                      placeholder="Ozel km"
                      className="app-input w-full sm:max-w-[9rem]"
                    />
                    <button
                      type="button"
                      onClick={handleCustomSapmaApply}
                      disabled={!isCustomSapmaValid}
                      className="app-button-secondary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Uygula
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <form onSubmit={onApplyFilters} className="space-y-3">
            <div className="rounded-[1rem] border border-slate-200 bg-white p-3.5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Konum
                </p>
                <p className="text-sm leading-5 text-slate-600">
                  Bolge sec.
                </p>
              </div>

              <div className="mt-3 space-y-3">
                <CitySelectField
                  id="baslangicSehir"
                  label="Baslangic sehri"
                  options={TURKEY_CITY_OPTIONS}
                  placeholder="Il sec"
                  value={filters.baslangicSehir}
                  onChange={onBaslangicSehirChange}
                />
                <CitySelectField
                  id="varisSehir"
                  label="Varis sehri"
                  options={TURKEY_CITY_OPTIONS}
                  placeholder="Il sec"
                  value={filters.varisSehir}
                  onChange={onVarisSehirChange}
                />
              </div>
            </div>

            <div className="rounded-[1rem] border border-slate-200 bg-white p-3.5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Yuk ozellikleri
                </p>
                <p className="text-sm leading-5 text-slate-600">
                  Yuk tipi, hacim ve agirlik siniri belirle.
                </p>
              </div>

              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700" htmlFor="yukTipi">
                    Yuk tipi
                  </label>
                  <select
                    id="yukTipi"
                    name="yukTipi"
                    value={filters.yukTipi}
                    onChange={onFilterChange}
                    className="app-input w-full"
                  >
                    <option value="">Tum tipler</option>
                    {CARGO_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="tekTasimaIstiyor"
                  >
                    Tasima tercihi
                  </label>
                  <select
                    id="tekTasimaIstiyor"
                    name="tekTasimaIstiyor"
                    value={filters.tekTasimaIstiyor}
                    onChange={onFilterChange}
                    className="app-input w-full"
                  >
                    <option value="all">Hepsi</option>
                    <option value="true">Sadece tek tasima</option>
                    <option value="false">Paylasimli olabilir</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700" htmlFor="minAgirlikKg">
                      Min agirlik (kg)
                    </label>
                    <input
                      id="minAgirlikKg"
                      name="minAgirlikKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minAgirlikKg}
                      onChange={onFilterChange}
                      className="app-input w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700" htmlFor="maxAgirlikKg">
                      Max agirlik (kg)
                    </label>
                    <input
                      id="maxAgirlikKg"
                      name="maxAgirlikKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxAgirlikKg}
                      onChange={onFilterChange}
                      className="app-input w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700" htmlFor="minHacimM3">
                      Min hacim (m3)
                    </label>
                    <input
                      id="minHacimM3"
                      name="minHacimM3"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minHacimM3}
                      onChange={onFilterChange}
                      className="app-input w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700" htmlFor="maxHacimM3">
                      Max hacim (m3)
                    </label>
                    <input
                      id="maxHacimM3"
                      name="maxHacimM3"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxHacimM3}
                      onChange={onFilterChange}
                      className="app-input w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1rem] border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">
                  {filtersActive ? "Filtreler hazir" : "Tum acik talepler"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="app-pressable app-button-secondary text-sm"
                  >
                    Temizle
                  </button>
                  <button
                    type="submit"
                    className="app-pressable app-button-primary text-sm"
                  >
                    Sonuclari goster
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </aside>
  );
}
