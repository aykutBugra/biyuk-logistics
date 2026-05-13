"use client";

import Link from "next/link";
import type { VehicleListItem } from "@/lib/api/vehicles";
import {
  formatVolumeM3,
  formatWeightKg,
  getVehicleBodyTypeLabel,
} from "@/lib/logistics";

type CarrierVehicleCapacityPanelProps = {
  vehicle: VehicleListItem | null;
};

function resolveVehicleStatus(vehicle: VehicleListItem): {
  label: string;
  tone: string;
  description: string;
} {
  if (vehicle.capacitySummary.hesapEksigiVar) {
    return {
      label: "Eksik bilgi",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Olcum veya kapasite bilgilerini tamamlamalisin.",
    };
  }

  if (
    vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar ||
    vehicle.capacitySummary.kalanAgirlikKg <= 0 ||
    (vehicle.capacitySummary.kalanHacimM3 !== null &&
      vehicle.capacitySummary.kalanHacimM3 <= 0)
  ) {
    return {
      label: "Kapasite dolu",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
      description: "Mevcut rezervasyonlar yeni teklifleri sinirlayabilir.",
    };
  }

  return {
    label: "Uygun",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    description: "Rezervasyon yok, kapasite uygun.",
  };
}

export default function CarrierVehicleCapacityPanel({
  vehicle,
}: CarrierVehicleCapacityPanelProps) {
  if (!vehicle) {
    return (
      <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
        <h2 className="text-[1.9rem] font-black tracking-tight text-slate-950">
          Arac kapasitesi
        </h2>
        <div className="mt-5 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 p-5">
          <p className="text-base font-semibold text-slate-900">Arac bilgisi yok</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Arac kapasiteni ekleyerek teklif verebilirsin.
          </p>
          <Link href="/dashboard/arac_ekle" className="app-button-primary mt-5">
            Arac ekle
          </Link>
        </div>
      </section>
    );
  }

  const status = resolveVehicleStatus(vehicle);

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
      <h2 className="text-[1.9rem] font-black tracking-tight text-slate-950">
        Arac kapasitesi
      </h2>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {vehicle.marka} {vehicle.model}
          </p>
          <p className="mt-2 text-[2.1rem] font-black tracking-tight text-slate-950">
            {formatWeightKg(vehicle.maksimumAgirlikKg)} /{" "}
            {formatVolumeM3(vehicle.maksimumHacimM3)}
          </p>
          <p className="mt-2 text-sm text-slate-500">{status.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {vehicle.plaka}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {getVehicleBodyTypeLabel(vehicle.kasaTipi)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Kalan agirlik {formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg)}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div className="relative flex min-h-[160px] items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
            {vehicle.vehicleImageUrl ? (
              <img
                src={vehicle.vehicleImageUrl}
                alt={`${vehicle.marka} ${vehicle.model} fotografi`}
                className="h-full min-h-[160px] w-full object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-white text-slate-300 shadow-sm">
                <i className="pi pi-truck text-4xl" />
              </div>
            )}
            <span
              className={`absolute bottom-3 right-3 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}
            >
              {status.label}
            </span>
          </div>

          <Link href="/dashboard/araclarim" className="app-button-secondary">
            Araclarim
          </Link>
        </div>
      </div>
    </section>
  );
}
