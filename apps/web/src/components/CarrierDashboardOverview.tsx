"use client";

import CarrierActivityPanel from "@/components/CarrierActivityPanel";
import CarrierMetricCard from "@/components/CarrierMetricCard";
import CarrierQuickActionsPanel from "@/components/CarrierQuickActionsPanel";
import type { CarrierHomeData } from "@/lib/dashboard/use-home-data";

type CarrierDashboardOverviewProps = {
  home: CarrierHomeData;
};

export default function CarrierDashboardOverview({
  home,
}: CarrierDashboardOverviewProps) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CarrierMetricCard
          label="Uygun Yuk"
          value={home.suitableOpenRequestCount}
          hint="Rotalarina yakin"
          tone="blue"
          icon={<i className="pi pi-box text-lg" />}
        />
        <CarrierMetricCard
          label="Tekliflerim"
          value={home.offerCount}
          hint="Yanit bekliyor"
          tone="emerald"
          icon={<i className="pi pi-send text-lg" />}
        />
        <CarrierMetricCard
          label="Aktif Nakliye"
          value={home.activeShipmentCount}
          hint="Devam eden is"
          tone="violet"
          icon={<i className="pi pi-truck text-lg" />}
        />
        <CarrierMetricCard
          label="Rotalarim"
          value={home.routeCount}
          hint="Kesif icin hazir"
          tone="blue"
          icon={<i className="pi pi-map text-lg" />}
        />
        <CarrierMetricCard
          label="Araclarim"
          value={home.vehicleCount}
          hint="Kapasite hazir"
          tone="amber"
          icon={<i className="pi pi-warehouse text-lg" />}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <CarrierActivityPanel activities={home.recentActivities} />
        <CarrierQuickActionsPanel />
      </div>
    </div>
  );
}
