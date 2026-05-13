"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import type { MyIncomingOfferItem } from "@/lib/api/offers";

type CustomerOffersPreviewPanelProps = {
  offers: MyIncomingOfferItem[];
};

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export default function CustomerOffersPreviewPanel({
  offers,
}: CustomerOffersPreviewPanelProps) {
  const pendingOffers = offers.filter((offer) => normalizeStatus(offer.durum) === "OLUSTURULDU");
  const previewOffer = [...pendingOffers].sort((left, right) => right.id - left.id)[0] ?? null;
  const formattedDate = previewOffer ? formatDate(previewOffer.tasimaTarihi) : null;

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[1.5rem] font-black tracking-tight text-slate-950">
            Gelen teklifler
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {previewOffer
              ? `Son teklif: ${formatCurrency(previewOffer.fiyat)} - ${previewOffer.carrierName}`
              : "Henuz gelen teklif yok."}
          </p>
        </div>

        <Link
          href="/dashboard/gelen_teklifler"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Tum teklifleri gor
        </Link>
      </div>

      {previewOffer ? (
        <div className="mt-4 rounded-[1.45rem] border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <CustomerInitialsAvatar
                name={previewOffer.carrierName}
                fallback={previewOffer.carrierUsername}
                imageUrl={previewOffer.carrierProfileImageUrl}
                size="md"
                tone="blue"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Karar bekliyor
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Istek #{previewOffer.requestId}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {previewOffer.carrierName}
                </h3>
                <p className="text-sm text-slate-500">@{previewOffer.carrierUsername}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <p className="text-[1.8rem] font-black leading-none tracking-tight text-emerald-600">
                {formatCurrency(previewOffer.fiyat)}
              </p>
              {formattedDate ? (
                <p className="text-sm text-slate-500">Tasima tarihi: {formattedDate}</p>
              ) : null}
              <Link href="/dashboard/gelen_teklifler" className="app-button-primary">
                Teklifi incele
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[1.45rem] border border-dashed border-slate-200 bg-slate-50/70 p-5">
          <p className="text-base font-semibold text-slate-900">Karar bekleyen teklif yok.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Nakliyeciler teklif gonderdiginde burada en guncel fiyatlari ve karar
            vermen gereken kayitlari goreceksin.
          </p>
        </div>
      )}

      <Link
        href="/dashboard/gelen_teklifler"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
      >
        Tum teklifleri gor
        <i className="pi pi-arrow-right text-xs" />
      </Link>
    </section>
  );
}
