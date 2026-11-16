"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import StatusBadge from "@/components/StatusBadge";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

export type MyOfferCardChip = {
  label: string;
  tone?: "default" | "blue" | "amber" | "emerald";
};

export type MyOfferCardModel = {
  id: string;
  requestId: string;
  durum: string;
  rotaBaslik: string;
  rotaMeta: string | null;
  fiyat: number;
  aracPlaka: string | null;
  planlananAlimTarihi: string | null;
  tahminiTeslimTarihi: string | null;
  musteriAdi: string | null;
  musteriKullaniciAdi: string | null;
  musteriBasHarfler: string;
  musteriProfileImageUrl?: string;
  not: string | null;
  chipler: MyOfferCardChip[];
  takipMetni: string;
  sonHareketTarihi: string | null;
  sonHareketAciklamasi: string | null;
  sinyalEtiketi: string;
  sinyalTonu: "emerald" | "amber" | "slate" | "blue";
  hasUnread: boolean;
  conversationHref: string;
  detailHref: string;
};

type MyOfferCardProps = {
  offer: MyOfferCardModel;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function getOfferStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Beklemede";
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

function getCardClasses(status: string, hasUnread: boolean): string {
  const normalizedStatus = status.trim().toUpperCase();

  if (normalizedStatus === "KABUL_EDILDI") {
    return "border-emerald-200 shadow-[0_16px_36px_rgba(16,185,129,0.08)]";
  }

  if (normalizedStatus === "REDDEDILDI" || normalizedStatus === "IPTAL_EDILDI") {
    return "border-slate-200 opacity-85";
  }

  if (hasUnread) {
    return "border-blue-200 shadow-[0_16px_36px_rgba(37,99,235,0.08)]";
  }

  return "border-slate-200 hover:border-blue-200";
}

export default function MyOfferCard({ offer }: MyOfferCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className={`rounded-[1.45rem] border bg-white shadow-sm transition-colors will-change-transform ${getCardClasses(
        offer.durum,
        offer.hasUnread
      )}`}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={offer.durum}
            label={getOfferStatusLabel(offer.durum)}
          />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Teklif
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Talep
          </span>
          {offer.aracPlaka ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {offer.aracPlaka}
            </span>
          ) : null}
          {offer.hasUnread ? (
            <CustomerWorkspaceSignalPill tone="blue" label="Okunmamis hareket" />
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-[1.9rem] font-black tracking-tight text-slate-950">
              {offer.rotaBaslik}
            </h2>
            {offer.rotaMeta ? (
              <p className="mt-1 text-sm text-slate-500">{offer.rotaMeta}</p>
            ) : null}

            {offer.chipler.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {offer.chipler.map((chip) => (
                  <span
                    key={`${offer.id}-${chip.label}`}
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
              Teklif tutari
            </p>
            <p className="mt-2 text-[2.35rem] font-black leading-none tracking-tight text-emerald-600">
              {formatCurrency(offer.fiyat)}
            </p>
            <div className="mt-3 xl:flex xl:justify-end">
              <CustomerWorkspaceSignalPill
                tone={offer.sinyalTonu}
                label={offer.sinyalEtiketi}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_230px]">
          <div className="min-w-0">
            <div className="flex min-w-0 gap-4">
              <CustomerInitialsAvatar
                name={offer.musteriAdi}
                fallback={offer.musteriKullaniciAdi ?? offer.musteriBasHarfler}
                imageUrl={offer.musteriProfileImageUrl}
                size="lg"
                tone="blue"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-black tracking-tight text-slate-950">
                    {offer.musteriAdi ?? "Musteri bilgisi paylasilmadi"}
                  </p>
                  {offer.musteriKullaniciAdi ? (
                    <span className="text-sm text-slate-400">
                      @{offer.musteriKullaniciAdi}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                  <span>{offer.takipMetni}</span>
                  {offer.sonHareketTarihi ? (
                    <span>Son hareket: {offer.sonHareketTarihi}</span>
                  ) : null}
                  {offer.planlananAlimTarihi ? (
                    <span>Planlanan alim: {offer.planlananAlimTarihi}</span>
                  ) : null}
                  {offer.tahminiTeslimTarihi ? (
                    <span>Tahmini teslim: {offer.tahminiTeslimTarihi}</span>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[1rem] border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Durum notu
                  </p>
                  {offer.sonHareketAciklamasi ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {offer.sonHareketAciklamasi}
                    </p>
                  ) : offer.not ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {offer.not}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      Bu teklife ait ek durum notu bulunmuyor.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <Link href={offer.detailHref} className="app-button-secondary w-full xl:w-auto">
              Detay
            </Link>
            <Link
              href={offer.conversationHref}
              className="app-button-secondary w-full xl:w-auto"
            >
              Konusmaya git
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
