"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import type { MyIncomingOfferItem } from "@/lib/api/offers";
import { formatDateOnly } from "@/lib/date-only";
import { formatTransportRouteLabel } from "@/lib/logistics";

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

function getRequestLabel(offer: MyIncomingOfferItem): string {
  return formatTransportRouteLabel({
    origin: offer.baslangicSehri,
    destination: offer.varisSehri,
    cargoType: offer.yukTipi,
  });
}

export default function CustomerOffersPreviewPanel({
  offers,
}: CustomerOffersPreviewPanelProps) {
  const pendingOffers = offers.filter((offer) => normalizeStatus(offer.durum) === "OLUSTURULDU");
  const previewOffer =
    [...pendingOffers].sort((left, right) => right.id.localeCompare(left.id))[0] ??
    null;
  const formattedPickupDate = previewOffer
    ? formatDateOnly(previewOffer.planlananAlimTarihi, "")
    : "";
  const formattedDeliveryDate = previewOffer
    ? formatDateOnly(previewOffer.tahminiTeslimTarihi, "")
    : "";
  const requestLabel = previewOffer ? getRequestLabel(previewOffer) : "";

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.5rem] font-black tracking-tight text-slate-950">
            Gelen teklifler
          </h2>
          <p className="mt-1 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
            {previewOffer
              ? `Son teklif: ${formatCurrency(previewOffer.fiyat)} - ${previewOffer.carrierName}`
              : "Henuz gelen teklif yok."}
          </p>
        </div>

        <Link
          href="/dashboard/gelen_teklifler"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Tum teklifleri gor
        </Link>
      </div>

      {previewOffer ? (
        <div className="mt-4 rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <CustomerInitialsAvatar
                name={previewOffer.carrierName}
                fallback={previewOffer.carrierUsername}
                imageUrl={previewOffer.carrierProfileImageUrl}
                size="md"
                tone="blue"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Karar bekliyor
                  </span>
                </div>
                <h3
                  className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-slate-950 [overflow-wrap:anywhere] sm:text-xl"
                  title={requestLabel}
                >
                  {requestLabel}
                </h3>
                <p className="mt-2 truncate text-sm font-semibold text-slate-700" title={previewOffer.carrierName}>
                  {previewOffer.carrierName}
                </p>
                <p className="truncate text-xs text-slate-500" title={`@${previewOffer.carrierUsername}`}>
                  @{previewOffer.carrierUsername}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 lg:max-w-[45%] lg:items-end lg:border-0 lg:pt-0">
              <p className="break-words text-[1.8rem] font-black leading-none tracking-tight text-emerald-600 [overflow-wrap:anywhere]">
                {formatCurrency(previewOffer.fiyat)}
              </p>
              {formattedPickupDate ? (
                <p className="break-words text-sm text-slate-500 lg:text-right">
                  Planlanan alim: {formattedPickupDate}
                </p>
              ) : null}
              {formattedDeliveryDate ? (
                <p className="break-words text-sm text-slate-500 lg:text-right">
                  Tahmini teslim: {formattedDeliveryDate}
                </p>
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
