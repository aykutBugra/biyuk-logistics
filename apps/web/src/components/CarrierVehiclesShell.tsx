"use client";

import type { ReactNode } from "react";
import DashboardShellFrame from "@/components/DashboardShellFrame";

type CarrierVehiclesShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function CarrierVehiclesShell({
  title,
  description,
  children,
}: CarrierVehiclesShellProps) {
  return (
    <DashboardShellFrame
      panelEyebrow="Nakliyeci Paneli"
      panelTitle="Operasyonlar"
      panelDescription="Acik istekleri kesfet, tekliflerini takip et, anlasilan isleri yurut ve arac varliklarini yonet."
      navGroups={[
        {
          title: "Kesfet ve Yonet",
          items: [
            {
              href: "/dashboard/acik_istekler",
              label: "Acik Istekler",
            },
            {
              href: "/dashboard/tekliflerim",
              label: "Tekliflerim",
            },
            {
              href: "/dashboard/nakliyelerim",
              label: "Nakliyelerim",
            },
          ],
        },
        {
          title: "Araclar",
          items: [
            {
              href: "/dashboard/araclarim",
              label: "Araclarim",
            },
            {
              href: "/dashboard/arac_ekle",
              label: "Arac Ekle",
            },
          ],
        },
        {
          title: "Hesabim",
          items: [
            {
              href: "/dashboard/puanlarim",
              label: "Puanlarim",
            },
            {
              href: "/dashboard/profil",
              label: "Profil",
            },
          ],
        },
      ]}
      title={title}
      description={description}
      pageEyebrow="Nakliyeci Akisi"
    >
      {children}
    </DashboardShellFrame>
  );
}
