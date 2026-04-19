"use client";

import type { ReactNode } from "react";
import DashboardShellFrame from "@/components/DashboardShellFrame";

type CustomerTransportRequestsShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function CustomerTransportRequestsShell({
  title,
  description,
  children,
}: CustomerTransportRequestsShellProps) {
  return (
    <DashboardShellFrame
      panelEyebrow="Musteri Paneli"
      panelTitle="Istek Akisi"
      panelDescription="Isteklerini olustur, teklifleri degerlendir ve anlasilan tasimalari tek yerden takip et."
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
      pageEyebrow="Musteri Akisi"
    >
      {children}
    </DashboardShellFrame>
  );
}
