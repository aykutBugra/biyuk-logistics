"use client";

import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import CitySelectField from "@/components/CitySelectField";
import type { CarrierRouteListItem } from "@/lib/api/carrier-routes";
import { CARGO_TYPE_OPTIONS, formatRouteDistanceKm, formatRouteDuration } from "@/lib/logistics";
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
  tasimaTarihi: string;
};

type CarrierDiscoveryFiltersProps = {
  resultsCount: number;
  selectedCarrierRouteId: number | null;
  selectedCarrierRoute: CarrierRouteListItem | null;
  routes: CarrierRouteListItem[];
  isRoutesLoading: boolean;
  routeErrorMessage: string | null;
  filters: CarrierDiscoveryFilterForm;
  filtersActive: boolean;
  effectiveMaxSapmaKm: number | null;
  routeDeviationRefinementKm: number | null;
  routeDeviationOptions: number[];
  onFilterChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onApplyFilters: (event: FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onCarrierRouteChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBaslangicSehirChange: (value: string) => void;
  onVarisSehirChange: (value: string) => void;
  onRouteDeviationChange: (value: number | null) => void;
};

function formatPlannedDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMaxSapma(value: number | null): string {
  if (value === null) {
    return "Varsayilan sapma";
  }

  return `Max sapma ${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value)} km`;
}

export default function CarrierDiscoveryFilters({
  resultsCount,
  selectedCarrierRouteId,
  selectedCarrierRoute,
  routes,
  isRoutesLoading,
  routeErrorMessage,
  filters,
  filtersActive,
  effectiveMaxSapmaKm,
  routeDeviationRefinementKm,
  routeDeviationOptions,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  onCarrierRouteChange,
  onBaslangicSehirChange,
  onVarisSehirChange,
  onRouteDeviationChange,
}: CarrierDiscoveryFiltersProps) {
  const hasRouteContext = selectedCarrierRouteId !== null && selectedCarrierRoute !== null;

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
              Rota secip sonuclari daralt.
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
                        {formatPlannedDate(selectedCarrierRoute.planlananTarih)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                        {formatRouteDistanceKm(selectedCarrierRoute.rotaMesafeMetre)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                        {formatRouteDuration(selectedCarrierRoute.rotaSureSaniye)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                        {formatMaxSapma(effectiveMaxSapmaKm)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedCarrierRouteId !== null && routeDeviationOptions.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-700">Ek sapma daraltma</p>
                    <button
                      type="button"
                      onClick={() => onRouteDeviationChange(null)}
                      className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                    >
                      Temizle
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onRouteDeviationChange(null)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        routeDeviationRefinementKm === null
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
                      }`}
                    >
                      Tum uygunlar
                    </button>
                    {routeDeviationOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => onRouteDeviationChange(option)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          routeDeviationRefinementKm === option
                            ? "bg-blue-600 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
                        }`}
                      >
                        {option} km
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={onApplyFilters} className="space-y-3">
            <div className="rounded-[1rem] border border-slate-200 bg-white p-3.5">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Konum ve tarih
                </p>
                <p className="text-sm leading-5 text-slate-600">
                  Bolge ve tarih sec.
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
                <div className="space-y-1">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="tasimaTarihi"
                  >
                    Tasima tarihi
                  </label>
                  <input
                    id="tasimaTarihi"
                    name="tasimaTarihi"
                    type="date"
                    value={filters.tasimaTarihi}
                    onChange={onFilterChange}
                    className="app-input w-full"
                  />
                </div>
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
