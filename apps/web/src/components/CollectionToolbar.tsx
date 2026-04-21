type CollectionToolbarProps = {
  title: string;
  description?: string;
  countLabel: string;
  hint?: string;
};

export default function CollectionToolbar({
  title,
  description,
  countLabel,
  hint,
}: CollectionToolbarProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-slate-600">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
            {countLabel}
          </span>
          {hint ? (
            <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
