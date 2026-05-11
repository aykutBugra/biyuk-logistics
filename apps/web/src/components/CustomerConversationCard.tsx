"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import StatusBadge from "@/components/StatusBadge";
import type { OfferThreadSummary } from "@/lib/api/offer-threads";
import { formatLocationLabel } from "@/lib/logistics";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type CustomerConversationCardProps = {
  thread: OfferThreadSummary;
  conversationHref: string;
  requestHref?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Hareket bekleniyor";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getOfferStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Bekliyor";
    case "KABUL_EDILDI":
      return "Kabul edildi";
    case "REDDEDILDI":
      return "Reddedildi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

export default function CustomerConversationCard({
  thread,
  conversationHref,
  requestHref,
}: CustomerConversationCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();
  const updatedAt = thread.lastMessageAt ?? thread.closedAt;
  const routeTitle = `${formatLocationLabel(
    thread.baslangicKonumMetni,
    thread.baslangicSehri
  )} -> ${formatLocationLabel(thread.varisKonumMetni, thread.varisSehri)}`;

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white p-4 shadow-sm transition-colors will-change-transform md:p-5 ${
        thread.hasUnread
          ? "border-blue-200 shadow-[0_14px_34px_rgba(37,99,235,0.08)]"
          : "border-slate-200 hover:border-blue-200"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <CustomerInitialsAvatar
            name={thread.karsiTarafAdSoyad}
            fallback={thread.karsiTarafKullaniciAdi}
            tone={thread.isClosed ? "slate" : "blue"}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={thread.durum}
                label={getOfferStatusLabel(thread.durum)}
              />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Teklif #{thread.offerId}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Istek #{thread.requestId}
              </span>
              <CustomerWorkspaceSignalPill
                tone={thread.isClosed ? "slate" : "emerald"}
                label={thread.isClosed ? "Kapali" : "Acik pazarlik"}
              />
              {thread.hasUnread ? (
                <CustomerWorkspaceSignalPill
                  tone="blue"
                  label={`${thread.unreadCount} yeni mesaj`}
                />
              ) : null}
            </div>

            <h3 className="mt-3 text-[1.8rem] font-black tracking-tight text-slate-950">
              {routeTitle}
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {thread.karsiTarafAdSoyad}{" "}
              <span className="text-slate-400">
                @{thread.karsiTarafKullaniciAdi}
              </span>
            </p>

            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
              {thread.lastMessageSummary ?? "Konusma akisi hazir."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:min-w-[260px] xl:items-end">
          <div className="xl:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Guncel fiyat
            </p>
            <p className="mt-2 text-[2.2rem] font-black leading-none tracking-tight text-emerald-600">
              {formatCurrency(thread.fiyat)}
            </p>
          </div>

          <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-500 xl:text-right">
            Son hareket: {formatDateTime(updatedAt)}
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {requestHref ? (
              <Link href={requestHref} className="app-button-secondary">
                Istek detayi
              </Link>
            ) : null}
            <Link href={conversationHref} className="app-button-primary">
              Konusmaya git
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
