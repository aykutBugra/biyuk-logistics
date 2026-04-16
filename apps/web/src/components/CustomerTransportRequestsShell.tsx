"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type CustomerTransportRequestsShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard/istek_ekle",
    label: "Istek Ekle",
  },
  {
    href: "/dashboard/isteklerim",
    label: "Isteklerim",
  },
];

function isActiveNavItem(pathname: string, href: string): boolean {
  if (href === "/dashboard/isteklerim") {
    return pathname === href || pathname.startsWith("/dashboard/isteklerim/");
  }

  return pathname === href;
}

export default function CustomerTransportRequestsShell({
  title,
  description,
  children,
}: CustomerTransportRequestsShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-24">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Musteri Paneli
                </p>
                <h2 className="text-lg font-black tracking-tight text-blue-950">
                  Transport Requests
                </h2>
                <p className="text-sm text-gray-600">
                  Istek olusturma ve kendi kayitlarini izleme alani.
                </p>
              </div>

              <nav className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = isActiveNavItem(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Transport Requests
                </p>
                <h1 className="text-3xl font-black tracking-tight text-blue-950">
                  {title}
                </h1>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
