import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { MyIncomingOfferItem } from "@/lib/api/offers";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type IncomingOfferCardProps = {
  offer: MyIncomingOfferItem;
  isProcessingThis: boolean;
  isAnyProcessing: boolean;
  onAccept: (offer: MyIncomingOfferItem) => void;
  onReject: (offer: MyIncomingOfferItem) => void;
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

export default function IncomingOfferCard({
  offer,
  isProcessingThis,
  isAnyProcessing,
  onAccept,
  onReject,
}: IncomingOfferCardProps) {
  const canDecide = offer.durum.trim().toUpperCase() === "OLUSTURULDU";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-200">
      {/* Request context band */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            Istek #{offer.requestId}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {getCargoTypeLabel(offer.yukTipi)}
          </span>
          {offer.agirlikKg !== null ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {formatWeightKg(offer.agirlikKg)}
            </span>
          ) : null}
          {offer.hacimM3 !== null ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {formatVolumeM3(offer.hacimM3)}
            </span>
          ) : null}
          {offer.tekTasimaIstiyor ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Tek tasima
            </span>
          ) : null}
          {offer.tasimaTarihi ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {offer.tasimaTarihi}
            </span>
          ) : null}
        </div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          {formatLocationLabel(offer.baslangicKonumMetni, offer.baslangicSehri)}{" "}
          →{" "}
          {formatLocationLabel(offer.varisKonumMetni, offer.varisSehri)}
        </h2>
      </div>

      {/* Offer detail section */}
      <div className="px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: offer identity + carrier + note */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={offer.durum}
                label={getOfferStatusLabel(offer.durum)}
              />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                Teklif #{offer.id}
              </span>
              {offer.aracPlaka ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {offer.aracPlaka}
                </span>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                {offer.carrierName}
              </p>
              <p className="text-xs text-slate-500">@{offer.carrierUsername}</p>
            </div>

            {offer.not ? (
              <p className="line-clamp-2 max-w-md text-sm leading-6 text-slate-600">
                {offer.not}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Teklif notu eklenmedi.</p>
            )}
          </div>

          {/* Right: price + actions */}
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="text-3xl font-black tracking-tight text-emerald-700">
              {formatCurrency(offer.fiyat)}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {canDecide ? (
                <button
                  type="button"
                  onClick={() => onAccept(offer)}
                  disabled={isAnyProcessing}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessingThis ? "Isleniyor..." : "Kabul Et"}
                </button>
              ) : null}

              <Link
                href={`/dashboard/konusmalar/teklif/${offer.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Konusmaya git
              </Link>

              <Link
                href={`/dashboard/isteklerim/${offer.requestId}`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Istek Detayi
              </Link>

              {canDecide ? (
                <button
                  type="button"
                  onClick={() => onReject(offer)}
                  disabled={isAnyProcessing}
                  className="text-sm font-semibold text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessingThis ? "Isleniyor..." : "Reddet"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
