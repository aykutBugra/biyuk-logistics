"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";

type CarrierVehiclesShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  headerVariant?: "default" | "compact";
  sidebarVariant?: "default" | "icon-rail";
  motionPreset?: "default" | "operational" | "form";
  cardMotionLimit?: number;
};

export default function CarrierVehiclesShell({
  title,
  description,
  children,
  headerActions,
  headerVariant,
  sidebarVariant,
  motionPreset,
  cardMotionLimit,
}: CarrierVehiclesShellProps) {
  return (
    <DashboardShell
      title={title}
      description={description}
      workspaceHint="carrier"
      headerActions={headerActions}
      headerVariant={headerVariant}
      sidebarVariant={sidebarVariant}
      motionPreset={motionPreset}
      cardMotionLimit={cardMotionLimit}
    >
      {children}
    </DashboardShell>
  );
}
