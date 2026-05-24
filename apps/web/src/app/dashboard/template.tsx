import type { ReactNode } from "react";
import DashboardRouteTemplate from "@/components/DashboardRouteTemplate";

// Dashboard alt route'lari degistikce transition wrapper'inin yeniden calismasini saglar.
export default function Template({ children }: { children: ReactNode }) {
  return <DashboardRouteTemplate>{children}</DashboardRouteTemplate>;
}
