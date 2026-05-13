"use client";

import type { ReactNode } from "react";

type OfferThreadDetailLayoutProps = {
  summary: ReactNode;
  timeline: ReactNode;
  actions?: ReactNode;
};

export default function OfferThreadDetailLayout({
  summary,
  timeline,
  actions,
}: OfferThreadDetailLayoutProps) {
  return (
    <div
      data-dashboard-primary
      className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start"
    >
      <aside className="xl:col-start-2 xl:row-start-1">{summary}</aside>

      <div className="space-y-4 xl:col-start-1 xl:row-start-1">{timeline}</div>

      {actions ? (
        <aside className="space-y-4 xl:col-start-2">{actions}</aside>
      ) : null}
    </div>
  );
}
