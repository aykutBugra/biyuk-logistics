import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { OfferItem } from "@/lib/api/offers";

type MyOfferCardProps = {
  offer: OfferItem;
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

function getNextStepHint(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Musteri yanitini bekliyor";
    case "KABUL_EDILDI":
      return "Teklif kabul edildi, nakliye akisi basliyor";
    case "REDDEDILDI":
      return "Bu teklif reddedildi";
    case "IPTAL_EDILDI":
      return "Bu teklif iptal edildi";
    default:
      return "";
  }
}

export default function MyOfferCard({ offer }: MyOfferCardProps) {
  const nextStepHint = getNextStepHint(offer.durum);
  const isResolved =
    offer.durum.trim().toUpperCase() === "REDDEDILDI" ||
    offer.durum.trim().toUpperCase() === "IPTAL_EDILDI";

  return (
    <article
      className={`rounded-2xl border bg-white shadow-sm transition-colors hover:border-blue-200 ${
        isResolved ? "border-slate-100 opacity-75" : "border-slate-200"
      }`}
    >
      {/* Header row: status + IDs + price */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={offer.durum}
            label={getOfferStatusLabel(offer.durum)}
          />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            Teklif #{offer.id}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            Istek #{offer.requestId}
          </span>
        </div>

        <p className="text-2xl font-black tracking-tight text-emerald-700">
          {formatCurrency(offer.fiyat)}
        </p>
      </div>

      {/* Body: route + vehicle + note */}
      <div className="mt-3 space-y-2 px-5">
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          {offer.baslangicSehri} → {offer.varisSehri}
        </h2>

        {offer.aracPlaka ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {offer.aracPlaka}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-400">
            Arac bilgisi yok
          </span>
        )}

        {offer.not ? (
          <p className="line-clamp-2 text-sm leading-6 text-slate-500">
            {offer.not}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Teklif notu eklenmedi.</p>
        )}
      </div>

      {/* Footer: next-step hint + actions */}
      <div className="mt-4 flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
        {nextStepHint ? (
          <p className="text-xs text-slate-500">{nextStepHint}</p>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/konusmalar/teklif/${offer.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Konusmaya git
          </Link>
          <Link
            href={`/dashboard/acik_istekler/${offer.requestId}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Istek Detayi
          </Link>
        </div>
      </div>
    </article>
  );
}
