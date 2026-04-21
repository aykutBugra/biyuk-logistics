"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardNavItem = {
  href: string;
  label: string;
};

type DashboardNavGroup = {
  title?: string;
  items: DashboardNavItem[];
};

type DashboardShellFrameProps = {
  panelEyebrow?: string;
  panelTitle: string;
  panelDescription?: string;
  navGroups: DashboardNavGroup[];
  title: string;
  description?: string;
  children: ReactNode;
  pageEyebrow?: string;
};

function isActiveNavItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShellFrame({
  panelEyebrow,
  panelTitle,
  panelDescription,
  navGroups,
  title,
  description,
  children,
  pageEyebrow,
}: DashboardShellFrameProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="space-y-2">
                {panelEyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
                    {panelEyebrow}
                  </p>
                ) : null}
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  {panelTitle}
                </h2>
                {panelDescription ? (
                  <p className="text-sm leading-6 text-slate-600">{panelDescription}</p>
                ) : null}
              </div>

              <div className="mt-8 space-y-6">
                {navGroups.map((group) => (
                  <div key={group.title ?? group.items.map((item) => item.href).join("-")}>
                    {group.title ? (
                      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {group.title}
                      </p>
                    ) : null}

                    <nav className="flex flex-col gap-2">
                      {group.items.map((item) => {
                        const isActive = isActiveNavItem(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`inline-flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                              isActive
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                {pageEyebrow ?? panelEyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
                    {pageEyebrow ?? panelEyebrow}
                  </p>
                ) : null}
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
