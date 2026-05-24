"use client";

import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import type { NotificationListItem } from "@/lib/api/notifications";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type CustomerNotificationCardProps = {
  notification: NotificationListItem;
  isActing?: boolean;
  actingAction?: "mark" | "open" | null;
  onMarkAsRead: () => void;
  onOpen: () => void;
};

type NotificationVisualModel = {
  label: string;
  icon: string;
  boxClassName: string;
  iconClassName: string;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resolveOpenLabel(hedefUrl: string): string {
  if (hedefUrl.startsWith("/dashboard/konusmalar/teklif/")) {
    return "Konusmaya git";
  }

  if (hedefUrl.startsWith("/dashboard/isteklerim/")) {
    return "Istek detayina git";
  }

  if (hedefUrl.startsWith("/dashboard/nakliyelerim/")) {
    return "Nakliyeyi ac";
  }

  if (hedefUrl.startsWith("/dashboard/puanlarim")) {
    return "Puanlarimi gor";
  }

  return "Ac";
}

function resolveVisualModel(tip: string): NotificationVisualModel {
  switch (tip.trim().toUpperCase()) {
    case "TEKLIF_GELDI":
      return {
        label: "Teklif",
        icon: "pi pi-wallet",
        boxClassName: "border-emerald-100 bg-emerald-50",
        iconClassName: "text-emerald-700",
      };
    case "TEKLIF_KABUL_EDILDI":
      return {
        label: "Kabul",
        icon: "pi pi-check-circle",
        boxClassName: "border-blue-100 bg-blue-50",
        iconClassName: "text-blue-700",
      };
    case "TEKLIF_REDDEDILDI":
      return {
        label: "Red",
        icon: "pi pi-times-circle",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    case "MESAJ_GELDI":
      return {
        label: "Mesaj",
        icon: "pi pi-comments",
        boxClassName: "border-blue-100 bg-blue-50",
        iconClassName: "text-blue-700",
      };
    case "KARSI_TEKLIF_GELDI":
      return {
        label: "Pazarlik",
        icon: "pi pi-refresh",
        boxClassName: "border-violet-100 bg-violet-50",
        iconClassName: "text-violet-700",
      };
    case "IS_BASLADI":
      return {
        label: "Is",
        icon: "pi pi-truck",
        boxClassName: "border-blue-100 bg-blue-50",
        iconClassName: "text-blue-700",
      };
    case "TESLIM_ONAYI_BEKLIYOR":
      return {
        label: "Onay",
        icon: "pi pi-clock",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    case "IS_TAMAMLANDI":
      return {
        label: "Teslim",
        icon: "pi pi-check",
        boxClassName: "border-emerald-100 bg-emerald-50",
        iconClassName: "text-emerald-700",
      };
    case "RATING_ALDIN":
      return {
        label: "Puan",
        icon: "pi pi-star-fill",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    case "RATING_BEKLIYOR":
      return {
        label: "Hatirlatma",
        icon: "pi pi-clock",
        boxClassName: "border-amber-100 bg-amber-50",
        iconClassName: "text-amber-700",
      };
    default:
      return {
        label: "Bildirim",
        icon: "pi pi-bell",
        boxClassName: "border-slate-200 bg-slate-100",
        iconClassName: "text-slate-600",
      };
  }
}

export default function CustomerNotificationCard({
  notification,
  isActing = false,
  actingAction = null,
  onMarkAsRead,
  onOpen,
}: CustomerNotificationCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();
  const visualModel = resolveVisualModel(notification.tip);
  const openLabel = notification.hedefUrl
    ? resolveOpenLabel(notification.hedefUrl)
    : null;

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white p-4 shadow-sm transition-colors will-change-transform md:p-5 ${
        notification.isRead
          ? "border-slate-200 hover:border-blue-200"
          : "border-blue-200 bg-blue-50/40 shadow-[0_14px_34px_rgba(37,99,235,0.08)]"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${visualModel.boxClassName} ${visualModel.iconClassName}`}
          >
            <i className={`${visualModel.icon} text-lg`} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CustomerWorkspaceSignalPill
                tone={notification.isRead ? "slate" : "blue"}
                label={notification.isRead ? "Okundu" : "Okunmamis"}
              />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {visualModel.label}
              </span>
            </div>

            <h3 className="mt-3 text-[1.45rem] font-black tracking-tight text-slate-950">
              {notification.baslik}
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {notification.mesaj}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:min-w-[240px] xl:items-end">
          <div className="xl:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Kayit tarihi
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {formatDateTime(notification.olusturmaTarihi)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {!notification.isRead ? (
              <button
                type="button"
                onClick={onMarkAsRead}
                disabled={isActing}
                className="app-button-secondary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActing && actingAction === "mark" ? "Isleniyor..." : "Okundu say"}
              </button>
            ) : null}

            {notification.hedefUrl && openLabel ? (
              <button
                type="button"
                onClick={onOpen}
                disabled={isActing}
                className="app-button-primary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActing && actingAction === "open" ? "Aciliyor..." : openLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
