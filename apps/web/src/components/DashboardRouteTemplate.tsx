"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useId } from "react";

const DashboardRouteTransitionContext = createContext("");

export default function DashboardRouteTemplate({
  children,
}: {
  children: ReactNode;
}) {
  const transitionId = useId();

  return (
    <DashboardRouteTransitionContext.Provider value={transitionId}>
      {children}
    </DashboardRouteTransitionContext.Provider>
  );
}

export function useDashboardRouteTransitionId() {
  return useContext(DashboardRouteTransitionContext);
}
