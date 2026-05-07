import Link from "next/link";
import type { VehicleListItem } from "@/lib/api/vehicles";
import {
  formatVolumeM3,
  formatWeightKg,
  getVehicleBodyTypeLabel,
} from "@/lib/logistics";

type VehicleCardProps = {
  vehicle: VehicleListItem;
  isDeleting: boolean;
  onDelete: (id: number) => void;
};

export default function VehicleCard({
  vehicle,
  isDeleting,
  onDelete,
}: VehicleCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-200">
      {/* Header zone */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            {vehicle.plaka}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            Arac #{vehicle.id}
          </span>
        </div>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          {vehicle.marka} {vehicle.model}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {getVehicleBodyTypeLabel(vehicle.kasaTipi)}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {formatWeightKg(vehicle.maksimumAgirlikKg)}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {formatVolumeM3(vehicle.maksimumHacimM3)}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {vehicle.yil} model
          </span>
        </div>
      </div>

      {/* Capacity / operation zone */}
      <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Kapasite ozeti
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <span>Rezerve agirlik</span>
              <span className="font-semibold text-slate-900">
                {formatWeightKg(vehicle.capacitySummary.rezerveAgirlikKg)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Kalan agirlik</span>
              <span className="font-semibold text-slate-900">
                {formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Rezerve hacim</span>
              <span className="font-semibold text-slate-900">
                {formatVolumeM3(vehicle.capacitySummary.rezerveHacimM3)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Kalan hacim</span>
              <span className="font-semibold text-slate-900">
                {formatVolumeM3(vehicle.capacitySummary.kalanHacimM3)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Operasyon durumu
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <span>Aktif rezervasyon</span>
              <span className="font-semibold text-slate-900">
                {vehicle.capacitySummary.aktifRezervasyonSayisi}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Tek tasima rezerv.</span>
              <span className="font-semibold text-slate-900">
                {vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar
                  ? "Var"
                  : "Yok"}
              </span>
            </div>
          </div>
          {vehicle.capacitySummary.hesapEksigiVar ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Kapasite ozeti eksik kayitlar nedeniyle kesin yorum degildir.
            </p>
          ) : null}
        </div>
      </div>

      {/* Action zone */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
        <Link
          href={`/dashboard/araclarim/${vehicle.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Detay
        </Link>
        <Link
          href={`/dashboard/araclarim/${vehicle.id}/duzenle`}
          className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          Duzenle
        </Link>
        <button
          type="button"
          onClick={() => onDelete(vehicle.id)}
          disabled={isDeleting}
          className="text-sm font-semibold text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Siliniyor..." : "Sil"}
        </button>
      </div>
    </article>
  );
}
