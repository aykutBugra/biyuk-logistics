"use client";

type CustomerWorkspaceSignalPillProps = {
  tone?: "emerald" | "amber" | "slate" | "blue";
  label: string;
};

const TONE_CLASSES: Record<
  NonNullable<CustomerWorkspaceSignalPillProps["tone"]>,
  string
> = {
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700",
};

export default function CustomerWorkspaceSignalPill({
  tone = "slate",
  label,
}: CustomerWorkspaceSignalPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
        TONE_CLASSES[tone]
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
