"use client";

import Link from "next/link";

type CarrierReadinessPanelProps = {
  routeCount: number;
  vehicleCount: number;
};

type ReadinessState =
  | {
      title: string;
      description: string;
      primaryHref: string;
      primaryLabel: string;
      secondaryHref?: string;
      secondaryLabel?: string;
    }
  | null;

function resolveReadinessState(
  routeCount: number,
  vehicleCount: number
): ReadinessState {
  const hasRoute = routeCount > 0;
  const hasVehicle = vehicleCount > 0;

  if (hasRoute && hasVehicle) {
    return {
      title: "Operasyona hazirsin",
      description: `${vehicleCount} arac ve ${routeCount} rota kayitli. Acik talepleri rota uyumuna gore kesfedebilirsin.`,
      primaryHref: "/dashboard/rotalarim",
      primaryLabel: "Rotalarim",
      secondaryHref: "/dashboard/araclarim",
      secondaryLabel: "Araclarim",
    };
  }

  if (hasVehicle && !hasRoute) {
    return {
      title: "Rota eklemen gerekiyor",
      description: "Rota tanimladiginda acik talepleri daha dogru kesfedebilirsin.",
      primaryHref: "/dashboard/rotalarim/yeni",
      primaryLabel: "Ilk rotami ekle",
    };
  }

  if (!hasVehicle && hasRoute) {
    return {
      title: "Arac bilgisi eksik",
      description: "Arac kapasiteni ekleyerek teklif surecini tamamlayabilirsin.",
      primaryHref: "/dashboard/arac_ekle",
      primaryLabel: "Arac ekle",
    };
  }

  return {
    title: "Operasyon hazirligi tamamlanmadi",
    description:
      "Rota ve arac bilgilerini ekleyerek uygun yukleri kesfetmeye baslayabilirsin.",
    primaryHref: "/dashboard/rotalarim/yeni",
    primaryLabel: "Rota ekle",
    secondaryHref: "/dashboard/arac_ekle",
    secondaryLabel: "Arac ekle",
  };
}

function ReadinessMiniCard(props: {
  title: string;
  value: number;
  hint: string;
  icon: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
          <i className={`${props.icon} text-sm`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-700">{props.title}</p>
          <p className="mt-1 text-[1.7rem] font-black leading-none tracking-tight text-slate-950">
            {props.value}
          </p>
          <p className="mt-1 text-sm text-slate-500">{props.hint}</p>
        </div>
      </div>
    </div>
  );
}

export default function CarrierReadinessPanel({
  routeCount,
  vehicleCount,
}: CarrierReadinessPanelProps) {
  const readiness = resolveReadinessState(routeCount, vehicleCount);

  if (!readiness) {
    return null;
  }

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
        Hazirlik
      </span>
      <h2 className="mt-4 text-[2rem] font-black tracking-tight text-slate-950">
        {readiness.title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-500">{readiness.description}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ReadinessMiniCard
          title="Rotalarim"
          value={routeCount}
          hint={routeCount > 0 ? "Kesif icin hazir" : "Rota eksik"}
          icon="pi pi-map"
        />
        <ReadinessMiniCard
          title="Araclarim"
          value={vehicleCount}
          hint={vehicleCount > 0 ? "Kapasite hazir" : "Arac eksik"}
          icon="pi pi-truck"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={readiness.primaryHref} className="app-button-secondary">
          {readiness.primaryLabel}
        </Link>
        {readiness.secondaryHref && readiness.secondaryLabel ? (
          <Link href={readiness.secondaryHref} className="app-button-secondary">
            {readiness.secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
