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
    <section className="app-surface rounded-[1.15rem] border border-slate-200 p-5 md:p-6">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950 md:text-xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <Link href={actionHref} className="app-button-primary">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
