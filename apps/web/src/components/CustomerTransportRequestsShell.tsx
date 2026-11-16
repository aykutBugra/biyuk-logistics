"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";

type CustomerTransportRequestsShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  pageEyebrow?: string;
  headerActions?: ReactNode;
  pageHeader?: ReactNode;
  headerVariant?: "default" | "compact";
  motionPreset?: "default" | "operational" | "form";
  cardMotionLimit?: number;
};

export default function CustomerTransportRequestsShell({
  title,
  description,
  children,
  pageEyebrow,
  headerActions,
  pageHeader,
  headerVariant,
  motionPreset,
  cardMotionLimit,
}: CustomerTransportRequestsShellProps) {
  return (
    <DashboardShell
      title={title}
      description={description}
      pageEyebrow={pageEyebrow}
      workspaceHint="customer"
      headerActions={headerActions}
      pageHeader={pageHeader}
      headerVariant={headerVariant}
      motionPreset={motionPreset}
      cardMotionLimit={cardMotionLimit}
    >
      {children}
    </DashboardShell>
  );
}
