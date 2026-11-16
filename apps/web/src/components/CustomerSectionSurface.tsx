"use client";

import type { ReactNode } from "react";

type CustomerSectionSurfaceProps = {
  title: string;
  count?: number | string | null;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function CustomerSectionSurface({
  title,
  count,
  description,
  action,
  children,
  className,
  contentClassName,
}: CustomerSectionSurfaceProps) {
  return (
    <section
      data-section-surface
      className={`app-surface-strong rounded-[1.6rem] border border-slate-200 shadow-sm ${
        className ?? ""
      }`.trim()}
    >
      <div data-section-header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                {title}
              </h2>
              {count !== null && count !== undefined ? (
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {count}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>

          {action ? <div className="sm:shrink-0">{action}</div> : null}
        </div>
      </div>

      <div data-section-body className={contentClassName ?? "p-5 md:p-6"}>{children}</div>
    </section>
  );
}
