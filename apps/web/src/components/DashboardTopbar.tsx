"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearStoredAuth,
  type StoredAuth,
  type StoredDashboardWorkspaceMode,
} from "@/lib/auth/auth-storage";

type DashboardTopbarProps = {
  auth: StoredAuth | null | undefined;
  workspaceMode: StoredDashboardWorkspaceMode | null;
  onMenuToggle?: () => void;
};

function WorkspaceModeBadge({ mode }: { mode: StoredDashboardWorkspaceMode | null }) {
  if (!mode) return null;

  const isCarrier = mode === "carrier";

  return (
    <span
      className={`hidden items-center rounded-full border px-3 py-1 text-xs font-semibold sm:inline-flex ${
        isCarrier
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {isCarrier ? "Nakliyeci" : "Müşteri"}
    </span>
  );
}

export default function DashboardTopbar({
  auth,
  workspaceMode,
  onMenuToggle,
}: DashboardTopbarProps) {
  const router = useRouter();

  const displayName = auth?.user
    ? `${auth.user.ad} ${auth.user.soyad}`.trim() || auth.user.kullaniciAdi
    : null;

  const handleLogout = () => {
    clearStoredAuth();
    router.replace("/login");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)]">
      <div className="flex h-[var(--topbar-height)] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
            aria-label="Menüyü aç"
          >
            <i className="pi pi-bars text-lg" />
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-slate-950 transition hover:opacity-90"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">
              B
            </span>
            <span className="text-base font-black tracking-tight md:text-lg">
              Bi'yuk
            </span>
          </Link>

          <WorkspaceModeBadge mode={workspaceMode} />
        </div>

        <div className="flex items-center gap-2">
          {displayName ? (
            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 sm:block">
              {displayName}
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <i className="pi pi-sign-out text-sm" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
}
