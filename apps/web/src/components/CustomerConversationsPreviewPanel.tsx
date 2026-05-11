"use client";

import Link from "next/link";
import type { OfferThreadSummary } from "@/lib/api/offer-threads";

type CustomerConversationsPreviewPanelProps = {
  threads: OfferThreadSummary[];
  unreadMessageCount: number;
};

function getInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "KN";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function formatThreadTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CustomerConversationsPreviewPanel({
  threads,
  unreadMessageCount,
}: CustomerConversationsPreviewPanelProps) {
  const previewThreads = [...threads]
    .sort((left, right) => {
      if (left.hasUnread !== right.hasUnread) {
        return left.hasUnread ? -1 : 1;
      }

      return (
        new Date(right.lastMessageAt ?? right.closedAt ?? 0).getTime() -
        new Date(left.lastMessageAt ?? left.closedAt ?? 0).getTime()
      );
    })
    .slice(0, 2);

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.7rem] font-black tracking-tight text-slate-950">
            Konusmalar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {unreadMessageCount > 0
              ? `${unreadMessageCount} okunmamis mesajiniz var.`
              : "Henuz okunmamis konusma yok."}
          </p>
        </div>

        <Link
          href="/dashboard/konusmalar"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Tum mesajlari ac
        </Link>
      </div>

      {previewThreads.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-100 rounded-[1.45rem] border border-slate-200 bg-white shadow-sm">
          {previewThreads.map((thread) => (
            <Link
              key={thread.id}
              href={`/dashboard/konusmalar/teklif/${thread.offerId}`}
              className="flex items-start gap-3 px-4 py-4 transition hover:bg-slate-50/80"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                {getInitials(thread.karsiTarafAdSoyad)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {thread.hasUnread ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                  )}
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {thread.karsiTarafAdSoyad}
                  </p>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                  {thread.lastMessageSummary ?? "Konusma hazir."}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-400">
                {formatThreadTime(thread.lastMessageAt)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.45rem] border border-dashed border-slate-200 bg-slate-50/70 p-6">
          <p className="text-base font-semibold text-slate-900">Konusma bekleniyor.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Teklifler ve pazarlik akislarin olustukca son mesajlarini burada goreceksin.
          </p>
        </div>
      )}

      <Link
        href="/dashboard/konusmalar"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
      >
        Tum konusmalari gor
        <i className="pi pi-arrow-right text-xs" />
      </Link>
    </section>
  );
}
