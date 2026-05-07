type SummaryStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  density?: "default" | "compact" | "tight";
};

export default function SummaryStatCard({
  label,
  value,
  hint,
  density = "default",
}: SummaryStatCardProps) {
  const isCompact = density === "compact";
  const isTight = density === "tight";

  return (
    <div
      className={`app-surface-strong transition hover:-translate-y-0.5 ${
        isTight
          ? "rounded-[1.2rem] p-3.5"
          : isCompact
            ? "rounded-[1.35rem] p-4"
            : "rounded-[1.6rem] p-5"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 font-black tracking-tight text-slate-950 ${
          isTight ? "text-[2rem]" : isCompact ? "text-3xl" : "text-4xl"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className={`mt-1.5 font-medium text-slate-500 ${isTight ? "text-[11px]" : "text-xs"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
