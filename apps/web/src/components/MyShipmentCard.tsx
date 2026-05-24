"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";
import type { MyOfferCardChip } from "@/components/MyOfferCard";

type ShipmentTimelineStep = {
  label: string;
  timestamp: string | null;
  state: "complete" | "current" | "pending";
};

export type MyShipmentCardModel = {
  id: string;
  requestId: string;
  durum: string;
  rotaBaslik: string;
  rotaMeta: string | null;
  fiyat: number;
  musteriAdi: string;
  musteriKullaniciAdi: string | null;
  aracEtiketi: string;
  chipler: MyOfferCardChip[];
  planlananTeslimat: string | null;
  kayitTarihi: string;
  durumNotu: string;
  sinyalEtiketi: string;
  sinyalTonu: "emerald" | "amber" | "slate" | "blue";
  isDelayed: boolean;
  detailHref: string;
  conversationHref: string | null;
  timelineSteps: ShipmentTimelineStep[];
};

type MyShipmentCardProps = {
  shipment: MyShipmentCardModel;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function getShipmentStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Aktif";
    case "BASLATILDI":
      return "Yolda";
    case "TESLIM_BEKLIYOR":
      return "Musteri onayi bekliyor";
    case "TAMAMLANDI":
      return "Tamamlandi";
    default:
      return status;
  }
}

function getChipClasses(tone: MyOfferCardChip["tone"] = "default"): string {
  switch (tone) {
    case "blue":
      return "bg-blue-50 text-blue-700";
    case "amber":
      return "bg-amber-50 text-amber-700";
    case "emerald":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getCardClasses(status: string, isDelayed: boolean): string {
  const normalizedStatus = status.trim().toUpperCase();

  if (isDelayed) {
    return "border-rose-200 shadow-[0_16px_36px_rgba(244,63,94,0.08)]";
  }

  if (normalizedStatus === "TAMAMLANDI") {
    return "border-emerald-200 shadow-[0_16px_36px_rgba(16,185,129,0.08)]";
  }

  if (normalizedStatus === "BASLATILDI" || normalizedStatus === "TESLIM_BEKLIYOR") {
    return "border-blue-200 shadow-[0_16px_36px_rgba(37,99,235,0.08)]";
  }

  return "border-slate-200 hover:border-blue-200";
}

function getTimelineDotClasses(state: ShipmentTimelineStep["state"]): string {
  switch (state) {
    case "complete":
      return "border-emerald-200 bg-emerald-500 text-white";
    case "current":
      return "border-blue-200 bg-blue-500 text-white";
    default:
      return "border-slate-200 bg-white text-slate-300";
  }
}

function getTimelineLineClasses(state: ShipmentTimelineStep["state"]): string {
  if (state === "complete") {
    return "bg-emerald-300";
  }

  if (state === "current") {
    return "bg-blue-300";
  }

  return "bg-slate-200";
}

export default function MyShipmentCard({ shipment }: MyShipmentCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white shadow-sm transition-colors will-change-transform ${getCardClasses(
        shipment.durum,
        shipment.isDelayed
      )}`}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={shipment.durum}
            label={getShipmentStatusLabel(shipment.durum)}
          />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Nakliye
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Istek
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-[1.9rem] font-black tracking-tight text-slate-950">
              {shipment.rotaBaslik}
            </h2>
            {shipment.rotaMeta ? (
              <p className="mt-1 text-sm text-slate-500">{shipment.rotaMeta}</p>
            ) : null}

            {shipment.chipler.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {shipment.chipler.map((chip) => (
                  <span
                    key={`${shipment.id}-${chip.label}`}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getChipClasses(
                      chip.tone
                    )}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="xl:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Anlasilan fiyat
            </p>
            <p className="mt-2 text-[2.35rem] font-black leading-none tracking-tight text-emerald-600">
              {formatCurrency(shipment.fiyat)}
            </p>
            <div className="mt-3 xl:flex xl:justify-end">
              <CustomerWorkspaceSignalPill
                tone={shipment.sinyalTonu}
                label={shipment.sinyalEtiketi}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-950">
                Musteri: {shipment.musteriAdi}
              </span>
              {shipment.musteriKullaniciAdi ? (
                <span>@{shipment.musteriKullaniciAdi}</span>
              ) : null}
              <span>{shipment.aracEtiketi}</span>
            </div>

            <div className="mt-4 rounded-[1rem] border border-slate-100 bg-slate-50/80 p-4">
              <div className="relative grid gap-4 md:grid-cols-3">
                {shipment.timelineSteps.map((step, index) => (
                  <div key={step.label} className="relative pl-8">
                    {index < shipment.timelineSteps.length - 1 ? (
                      <span
                        className={`absolute left-3 top-4 hidden h-px w-[calc(100%-1.5rem)] md:block ${getTimelineLineClasses(
                          step.state
                        )}`}
                      />
                    ) : null}
                    <span
                      className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${getTimelineDotClasses(
                        step.state
                      )}`}
                    >
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {step.timestamp ?? "Henuz yok"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {shipment.durumNotu}
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="w-full rounded-[1rem] border border-slate-100 bg-slate-50/80 p-4 xl:max-w-[220px]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Planlanan teslimat
              </p>
              <p className="mt-2 text-base font-black tracking-tight text-slate-950">
                {shipment.planlananTeslimat ?? "Belirtilmedi"}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Kayit: {shipment.kayitTarihi}
              </p>
            </div>

            <Link href={shipment.detailHref} className="app-button-secondary w-full xl:w-auto">
              Detay
            </Link>
            {shipment.conversationHref ? (
              <Link
                href={shipment.conversationHref}
                className="app-button-secondary w-full xl:w-auto"
              >
                Konusmaya git
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
