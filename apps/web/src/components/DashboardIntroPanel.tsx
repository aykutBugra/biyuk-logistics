"use client";

import type { StoredDashboardIntroRole } from "@/lib/auth/auth-storage";

type DashboardIntroPanelProps = {
  role: StoredDashboardIntroRole;
  isSubmitting: boolean;
  errorMessage: string | null;
  onContinue: () => void;
  onShortcut: () => void;
};

const INTRO_CONTENT: Record<
  StoredDashboardIntroRole,
  {
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
    shortcutLabel: string;
  }
> = {
  carrier: {
    eyebrow: "Nakliyeci rehberi",
    title: "Nakliyeci tarafına hoş geldin",
    description:
      "Bu rehber yalnızca bu role ilk girişte görünür. Kapatıldıktan sonra aynı ekran doğrudan genel bakış olarak açılır.",
    bullets: [
      "Açık İstekler ekranında rotana ve kapasiten uygun talepleri keşfedersin.",
      "Tekliflerim, verdiğin teklifleri ve anlaşmalarını birlikte takip eder.",
      "Rotalar ve araçlar tamamlandıkça görünürlüğün ve teklif kaliten artar.",
    ],
    shortcutLabel: "Açık istekleri aç",
  },
  customer: {
    eyebrow: "Müşteri rehberi",
    title: "Müşteri tarafına hoş geldin",
    description:
      "Bu rehber yalnızca bu role ilk girişte görünür. Kapatıldıktan sonra aynı ekran doğrudan genel bakış olarak açılır.",
    bullets: [
      "İsteklerim ekranında taleplerini ve güncel durumlarını izlersin.",
      "Gelen Teklifler ekranında fiyatları ve konuşmaları birlikte değerlendirirsin.",
      "Anlaşılmış iş göstergesi, teklif operasyona geçtiğinde otomatik güncellenir.",
    ],
    shortcutLabel: "İsteklerime git",
  },
};

export default function DashboardIntroPanel({
  role,
  isSubmitting,
  errorMessage,
  onContinue,
  onShortcut,
}: DashboardIntroPanelProps) {
  const content = INTRO_CONTENT[role];

  return (
    <div className="app-surface-strong overflow-hidden rounded-[1.8rem]">
      <div className="app-hero-surface px-6 py-6 text-white md:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
          {content.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
          {content.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/90">
          {content.description}
        </p>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
        {content.bullets.map((bullet, index) => (
          <div key={index} className="app-surface-muted rounded-[1.35rem] p-4">
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
              {index + 1}
            </div>
            <p className="text-sm leading-6 text-slate-600">{bullet}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100/80 px-6 py-5 md:px-8">
        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onContinue}
            disabled={isSubmitting}
            className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Hazırlanıyor..." : "Devam et"}
          </button>
          <button
            type="button"
            onClick={onShortcut}
            disabled={isSubmitting}
            className="app-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {content.shortcutLabel}
          </button>
          <p className="text-sm text-slate-400">
            Bu rehber kapatıldıktan sonra tekrar otomatik açılmaz.
          </p>
        </div>
      </div>
    </div>
  );
}
