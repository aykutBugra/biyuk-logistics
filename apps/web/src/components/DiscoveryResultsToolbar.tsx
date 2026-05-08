"use client";

export type DiscoverySortMode = "recommended" | "newest" | "date";

type DiscoveryResultsToolbarProps = {
  resultsCount: number;
  sortMode: DiscoverySortMode;
  onSortModeChange: (value: DiscoverySortMode) => void;
  isMapVisible: boolean;
  onMapToggle: () => void;
  hasRouteContext: boolean;
  activeRefinementLabel?: string;
};

const SORT_OPTIONS: Array<{ value: DiscoverySortMode; label: string }> = [
  { value: "recommended", label: "En uygun" },
  { value: "newest", label: "En yeni" },
  { value: "date", label: "Tasima tarihi" },
];

export default function DiscoveryResultsToolbar({
  resultsCount,
  sortMode,
  onSortModeChange,
  isMapVisible,
  onMapToggle,
  hasRouteContext,
  activeRefinementLabel,
}: DiscoveryResultsToolbarProps) {
  return (
    <section className="app-surface rounded-[1.05rem] border border-slate-200 px-4 py-3.5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-slate-950 md:text-lg">
              {resultsCount} acik istek bulundu
            </h2>
            {activeRefinementLabel ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {activeRefinementLabel}
              </span>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {hasRouteContext
              ? "Rota uyumu ve sapma mesafesine gore siralaniyor."
              : "Guncel kesif sonuc listesi."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Siralama
            </span>
            <select
              value={sortMode}
              onChange={(event) =>
                onSortModeChange(event.target.value as DiscoverySortMode)
              }
              className="app-input min-w-[10rem]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onMapToggle}
            className="app-pressable app-button-secondary text-sm"
          >
            {isMapVisible ? "Haritayi gizle" : "Haritayi goster"}
          </button>
        </div>
      </div>
    </section>
  );
}
