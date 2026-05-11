"use client";

import type { ReactNode } from "react";

type CustomerMetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: "blue" | "emerald" | "violet" | "amber";
};

const TONE_STYLES: Record<
  NonNullable<CustomerMetricCardProps["tone"]>,
  { iconBox: string; iconColor: string }
> = {
  blue: {
    iconBox: "border-blue-100 bg-blue-50",
    iconColor: "text-blue-700",
  },
  emerald: {
    iconBox: "border-emerald-100 bg-emerald-50",
    iconColor: "text-emerald-700",
  },
  violet: {
    iconBox: "border-violet-100 bg-violet-50",
    iconColor: "text-violet-700",
  },
  amber: {
    iconBox: "border-amber-100 bg-amber-50",
    iconColor: "text-amber-700",
  },
};

export default function CustomerMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: CustomerMetricCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <article className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${styles.iconBox} ${styles.iconColor}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-[2rem] font-black leading-none tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
        </div>
      </div>
    </article>
  );
}
