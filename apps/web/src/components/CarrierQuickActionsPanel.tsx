"use client";

import Link from "next/link";

const QUICK_ACTIONS = [
  {
    href: "/dashboard/acik_istekler",
    label: "Acik istekleri kesfet",
    icon: "pi pi-search",
  },
  {
    href: "/dashboard/rotalarim/yeni",
    label: "Yeni rota olustur",
    icon: "pi pi-map",
  },
  {
    href: "/dashboard/arac_ekle",
    label: "Arac ekle / duzenle",
    icon: "pi pi-truck",
  },
  {
    href: "/dashboard/tekliflerim",
    label: "Tekliflerim",
    icon: "pi pi-send",
  },
  {
    href: "/dashboard/konusmalar",
    label: "Konusmalar",
    icon: "pi pi-comments",
  },
] as const;

export default function CarrierQuickActionsPanel() {
  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <h2 className="text-[1.7rem] font-black tracking-tight text-slate-950">
        Hizli islemler
      </h2>

      <div className="mt-5 space-y-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center justify-between rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
          >
            <span className="flex items-center gap-3">
              <i className={`${action.icon} text-sm text-slate-400`} />
              {action.label}
            </span>
            <i className="pi pi-angle-right text-xs text-slate-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}
