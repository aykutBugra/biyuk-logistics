import type { StoredDashboardWorkspaceMode } from "@/lib/auth/auth-storage";

type DashboardSegmentedWorkspaceViewProps = {
  value: StoredDashboardWorkspaceMode;
  onChange: (mode: StoredDashboardWorkspaceMode) => void;
};

export default function DashboardSegmentedWorkspaceView({
  value,
  onChange,
}: DashboardSegmentedWorkspaceViewProps) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("customer")}
        aria-pressed={value === "customer"}
        className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
          value === "customer"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        Musteri
      </button>
      <button
        type="button"
        onClick={() => onChange("carrier")}
        aria-pressed={value === "carrier"}
        className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
          value === "carrier"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        Nakliyeci
      </button>
    </div>
  );
}
