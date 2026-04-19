import Link from "next/link";

type EmptyStateCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyStateCard({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
