"use client";

import type { ReactNode } from "react";
import DashboardShellFrame from "@/components/DashboardShellFrame";

type CustomerTransportRequestsShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function CustomerTransportRequestsShell({
  title,
  description,
  children,
}: CustomerTransportRequestsShellProps) {
  return (
    <DashboardShellFrame
      panelTitle="Musteri"
      navGroups={[
        {
          title: "Hizli Eylemler",
          items: [
            {
              href: "/dashboard/istek_ekle",
              label: "Istek Ekle",
            },
            {
              href: "/dashboard/isteklerim",
              label: "Isteklerim",
            },
            {
              href: "/dashboard/gelen_teklifler",
              label: "Gelen Teklifler",
            },
          ],
        },
        {
          title: "Hesabim",
          items: [
            {
              href: "/dashboard/bildirimler",
              label: "Bildirimler",
            },
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
    >
      {children}
    </DashboardShellFrame>
  );
}
