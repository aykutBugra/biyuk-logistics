"use client";

type CarrierDiscoverySummaryCardTone = "blue" | "emerald" | "amber" | "slate";

type CarrierDiscoverySummaryCardProps = {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: string;
  tone?: CarrierDiscoverySummaryCardTone;
};

const toneClassMap: Record<
  CarrierDiscoverySummaryCardTone,
  { icon: string; value: string }
> = {
  blue: {
    icon: "bg-blue-50 text-blue-700 ring-blue-100",
    value: "text-blue-700",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    value: "text-emerald-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
    value: "text-amber-700",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600 ring-slate-200",
    value: "text-slate-900",
  },
};

export default function CarrierDiscoverySummaryCard({
  label,
  value,
  subtext,
  icon,
  tone = "slate",
}: CarrierDiscoverySummaryCardProps) {
  const toneClasses = toneClassMap[tone];

  return (
    <section className="app-surface rounded-[1.05rem] border border-slate-200 px-4 py-3.5">
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClasses.icon}`}
            aria-hidden="true"
          >
            <i className={`${icon} text-sm`} />
          </span>
        ) : null}

        <div className="min-w-0 space-y-0.5">
          <p className="text-[12px] font-medium leading-5 text-slate-500">
            {label}
          </p>
          <p className={`text-[1.35rem] font-black tracking-tight ${toneClasses.value}`}>
            {value}
          </p>
          {subtext ? (
            <p className="text-xs leading-5 text-slate-400">{subtext}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
