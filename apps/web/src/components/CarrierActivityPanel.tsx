"use client";

import Link from "next/link";
import type { CarrierDashboardActivity } from "@/lib/dashboard/use-home-data";

type CarrierActivityPanelProps = {
  activities: CarrierDashboardActivity[];
};

function formatActivityTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getToneClasses(tone: CarrierDashboardActivity["tone"]): string {
  switch (tone) {
    case "emerald":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "blue":
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "amber":
      return "border-amber-100 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

export default function CarrierActivityPanel({
  activities,
}: CarrierActivityPanelProps) {
  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <h2 className="text-[1.7rem] font-black tracking-tight text-slate-950">
        Son aktiviteler
      </h2>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 p-5">
          <p className="text-base font-semibold text-slate-900">Henuz aktivite yok.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Teklif, rota, arac veya konusma hareketleri olustukca burada goreceksin.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {activities.map((activity) => {
            const content = (
              <div className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-blue-200">
                <div
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getToneClasses(
                    activity.tone
                  )}`}
                >
                  <i className="pi pi-bolt text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-950">{activity.title}</p>
                    {activity.badge ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {activity.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{activity.description}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-400">
                  {formatActivityTime(activity.timestamp)}
                </span>
              </div>
            );

            return activity.href ? (
              <Link key={activity.id} href={activity.href}>
                {content}
              </Link>
            ) : (
              <div key={activity.id}>{content}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
