"use client";

import CustomerConversationsPreviewPanel from "@/components/CustomerConversationsPreviewPanel";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerOffersPreviewPanel from "@/components/CustomerOffersPreviewPanel";
import CustomerRecentRequestsPanel from "@/components/CustomerRecentRequestsPanel";
import type { CustomerHomeData } from "@/lib/dashboard/use-home-data";

type CustomerDashboardOverviewProps = {
  home: CustomerHomeData;
};

export default function CustomerDashboardOverview({
  home,
}: CustomerDashboardOverviewProps) {
  const unreadTotal = home.unreadMessageCount + home.unreadNotificationCount;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CustomerMetricCard
          label="Aktif istek"
          value={home.openRequestCount}
          hint="Teklif almaya acik"
          tone="blue"
          icon={<i className="pi pi-box text-lg" />}
        />
        <CustomerMetricCard
          label="Gelen Teklif"
          value={home.pendingIncomingOfferCount}
          hint="Karar bekliyor"
          tone="emerald"
          icon={<i className="pi pi-wallet text-lg" />}
        />
        <CustomerMetricCard
          label="Okunmamis"
          value={unreadTotal}
          hint="Mesaj / bildirim"
          tone="violet"
          icon={<i className="pi pi-comments text-lg" />}
        />
        <CustomerMetricCard
          label="Tamamlanan"
          value={home.completedRequestCount}
          hint="Gecmis tasima"
          tone="amber"
          icon={<i className="pi pi-check text-lg" />}
        />
      </section>

      <CustomerOffersPreviewPanel offers={home.incomingOffers} />

      <section className="grid gap-4 xl:grid-cols-2">
        <CustomerRecentRequestsPanel
          requests={home.requests}
          incomingOffers={home.incomingOffers}
        />
        <CustomerConversationsPreviewPanel
          threads={home.threads}
          unreadMessageCount={home.unreadMessageCount}
        />
      </section>
    </div>
  );
}
