import type { ReactNode } from "react";
import DashboardRouteTemplate from "@/components/DashboardRouteTemplate";

export default function Template({ children }: { children: ReactNode }) {
  return <DashboardRouteTemplate>{children}</DashboardRouteTemplate>;
}
