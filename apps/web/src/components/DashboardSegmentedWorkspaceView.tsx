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
    <div className="inline-flex rounded-2xl bg-slate-100/80 p-1">
      <button
        type="button"
        onClick={() => onChange("customer")}
        aria-pressed={value === "customer"}
        className={`rounded-[0.9rem] px-3.5 py-2 text-sm font-semibold transition ${
          value === "customer"
            ? "bg-white text-amber-700 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Müşteri
      </button>
      <button
        type="button"
        onClick={() => onChange("carrier")}
        aria-pressed={value === "carrier"}
        className={`rounded-[0.9rem] px-3.5 py-2 text-sm font-semibold transition ${
          value === "carrier"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Nakliyeci
      </button>
    </div>
  );
}
