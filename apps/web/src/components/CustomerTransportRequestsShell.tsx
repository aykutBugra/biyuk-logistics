"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";

type CustomerTransportRequestsShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  headerVariant?: "default" | "compact";
  motionPreset?: "default" | "operational" | "form";
  cardMotionLimit?: number;
};

export default function CustomerTransportRequestsShell({
  title,
  description,
  children,
  headerActions,
  headerVariant,
  motionPreset,
  cardMotionLimit,
}: CustomerTransportRequestsShellProps) {
  return (
    <DashboardShell
      title={title}
      description={description}
      workspaceHint="customer"
      headerActions={headerActions}
      headerVariant={headerVariant}
      motionPreset={motionPreset}
      cardMotionLimit={cardMotionLimit}
    >
      {children}
    </DashboardShell>
  );
}
