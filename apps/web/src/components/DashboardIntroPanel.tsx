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
    eyebrow: "Nakliye Paneli rehberi",
    title: "Nakliye Paneli’ne hoş geldiniz",
    description:
      "Bu rehber yalnizca bu role ilk giriste gorunur. Kapatildiktan sonra ayni ekran dogrudan genel bakis olarak acilir.",
    bullets: [
      "Açık Talepler ekraninda rotana ve kapasiten uygun talepleri kesfedersin.",
      "Tekliflerim, verdigin teklifleri ve anlasmalarini birlikte takip eder.",
      "Rotalar ve araclar tamamlandikca gorunurlugun ve teklif kaliten artar.",
    ],
    shortcutLabel: "Açık talepleri ac",
  },
  customer: {
    eyebrow: "Talep Paneli rehberi",
    title: "Talep Paneli’ne hoş geldiniz",
    description:
      "Bu rehber yalnizca bu role ilk giriste gorunur. Kapatildiktan sonra ayni ekran dogrudan genel bakis olarak acilir.",
    bullets: [
      "Taleplerim ekraninda taleplerini ve güncel durumlarini izlersin.",
      "Gelen Teklifler ekraninda fiyatlari ve konusmalari birlikte degerlendirirsin.",
      "Anlasilmis is gostergesi, teklif operasyona gectiginde otomatik guncellenir.",
    ],
    shortcutLabel: "Taleplerime git",
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
    <section className="app-surface-strong overflow-hidden rounded-[1.25rem] border border-slate-200">
      <div className="border-b border-slate-200 px-6 py-6 md:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
          {content.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-[2rem]">
          {content.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {content.description}
        </p>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
        {content.bullets.map((bullet, index) => (
          <div
            key={index}
            className="app-surface-muted rounded-[1rem] border border-slate-200 p-4"
          >
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-black text-blue-700">
              {index + 1}
            </div>
            <p className="text-sm leading-6 text-slate-600">{bullet}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-5 md:px-8">
        {errorMessage ? (
          <div className="app-form-error-banner mb-4 text-sm">{errorMessage}</div>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">
            Bu rehber kapatildiktan sonra tekrar otomatik acilmaz.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onContinue}
              disabled={isSubmitting}
              className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Hazirlaniyor..." : "Devam et"}
            </button>
            <button
              type="button"
              onClick={onShortcut}
              disabled={isSubmitting}
              className="app-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {content.shortcutLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
