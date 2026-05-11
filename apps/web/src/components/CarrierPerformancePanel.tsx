"use client";

type CarrierPerformancePanelProps = {
  offerCount: number;
  openOfferCount: number;
  acceptedOfferCount: number;
  activeShipmentCount: number;
  completedShipmentCount: number;
};

function PerformanceRow(props: {
  label: string;
  value: string | number;
  progress: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <p className="min-w-0 flex-1 text-sm font-medium text-slate-600">{props.label}</p>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${props.progress}%` }}
        />
      </div>
      <p className="w-16 text-right text-sm font-bold text-slate-950">{props.value}</p>
    </div>
  );
}

export default function CarrierPerformancePanel({
  offerCount,
  openOfferCount,
  acceptedOfferCount,
  activeShipmentCount,
  completedShipmentCount,
}: CarrierPerformancePanelProps) {
  if (offerCount === 0 && activeShipmentCount === 0 && completedShipmentCount === 0) {
    return (
      <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-5 shadow-sm md:p-6">
        <h2 className="text-[1.7rem] font-black tracking-tight text-slate-950">
          Performans ozeti
        </h2>
        <div className="mt-5 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/70 p-5">
          <p className="text-base font-semibold text-slate-900">Performans verisi olusmadi</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Teklif ve tasima gecmisi olustukca burada gorunecek.
          </p>
        </div>
      </section>
    );
  }

  const responseRatio = offerCount > 0 ? Math.round((acceptedOfferCount / offerCount) * 100) : 0;
  const activeShipmentRatio =
    activeShipmentCount + completedShipmentCount > 0
      ? Math.round(
          (activeShipmentCount / (activeShipmentCount + completedShipmentCount)) * 100
        )
      : 0;

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <h2 className="text-[1.7rem] font-black tracking-tight text-slate-950">
        Performans ozeti
      </h2>

      <div className="mt-5 space-y-4">
        <PerformanceRow
          label="Toplam teklif"
          value={offerCount}
          progress={Math.min(100, Math.max(12, offerCount * 10))}
        />
        <PerformanceRow
          label="Yanit bekleyen"
          value={openOfferCount}
          progress={offerCount > 0 ? Math.round((openOfferCount / offerCount) * 100) : 0}
        />
        <PerformanceRow
          label="Sonuclanan teklif"
          value={`${responseRatio}%`}
          progress={responseRatio}
        />
        <PerformanceRow
          label="Aktif / tamamlanan tasima"
          value={`${activeShipmentCount}/${completedShipmentCount}`}
          progress={activeShipmentRatio}
        />
      </div>
    </section>
  );
}
