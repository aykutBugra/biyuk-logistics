"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";

type CustomerTransportRequestsShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  headerActions?: ReactNode;
};

export default function CustomerTransportRequestsShell({
  title,
  description,
  children,
  headerActions,
}: CustomerTransportRequestsShellProps) {
  return (
    <DashboardShell
      title={title}
      description={description}
      workspaceHint="customer"
      headerActions={headerActions}
    >
      {children}
    </DashboardShell>
  );
}
