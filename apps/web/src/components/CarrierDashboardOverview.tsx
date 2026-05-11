"use client";

import CarrierActivityPanel from "@/components/CarrierActivityPanel";
import CarrierMetricCard from "@/components/CarrierMetricCard";
import CarrierOpportunityPanel from "@/components/CarrierOpportunityPanel";
import CarrierPerformancePanel from "@/components/CarrierPerformancePanel";
import CarrierQuickActionsPanel from "@/components/CarrierQuickActionsPanel";
import CarrierReadinessPanel from "@/components/CarrierReadinessPanel";
import CarrierRouteDiscoveryPanel from "@/components/CarrierRouteDiscoveryPanel";
import CarrierVehicleCapacityPanel from "@/components/CarrierVehicleCapacityPanel";
import type { CarrierHomeData } from "@/lib/dashboard/use-home-data";

type CarrierDashboardOverviewProps = {
  home: CarrierHomeData;
};

export default function CarrierDashboardOverview({
  home,
}: CarrierDashboardOverviewProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <CarrierOpportunityPanel
          request={home.featuredRequest}
          routePreview={home.routePreview}
        />
        <CarrierReadinessPanel
          routeCount={home.routeCount}
          vehicleCount={home.vehicleCount}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CarrierRouteDiscoveryPanel routePreview={home.routePreview} />
        <CarrierVehicleCapacityPanel vehicle={home.vehiclePreview} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.95fr)_minmax(280px,0.95fr)]">
        <CarrierActivityPanel activities={home.recentActivities} />
        <CarrierQuickActionsPanel />
        <CarrierPerformancePanel
          offerCount={home.offerCount}
          openOfferCount={home.openOfferCount}
          acceptedOfferCount={home.acceptedOfferCount}
          activeShipmentCount={home.activeShipmentCount}
          completedShipmentCount={home.completedShipmentCount}
        />
      </section>
    </div>
  );
}
