"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import DashboardTopbar from "@/components/DashboardTopbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import type { DashboardRenderedNavGroup } from "@/lib/dashboard/navigation";
import type { StoredAuth, StoredDashboardWorkspaceMode } from "@/lib/auth/auth-storage";
import { gsap } from "@/lib/motion/gsap-client";
import { MOTION_DURATIONS, MOTION_EASES, MOTION_LAYOUT, MOTION_STAGGERS } from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { useSurfaceReveal } from "@/lib/motion/useSurfaceReveal";

type DashboardShellFrameProps = {
  auth: StoredAuth | null | undefined;
  panelEyebrow?: string;
  panelTitle: string;
  panelDescription?: string;
  navGroups: DashboardRenderedNavGroup[];
  workspaceMode: StoredDashboardWorkspaceMode | null;
  dualBusinessRoles: boolean;
  onWorkspaceChange: (mode: StoredDashboardWorkspaceMode) => void;
  title: string;
  description?: string;
  children: ReactNode;
  pageEyebrow?: string;
  headerActions?: ReactNode;
  headerVariant?: "default" | "compact";
  sidebarVariant?: "default" | "icon-rail";
  sidebarBehaviorScope?: "home" | "child" | "other";
};

let rememberedDashboardChildSidebarExpanded = false;
const dashboardChildSidebarListeners = new Set<() => void>();

function subscribeToDashboardChildSidebarExpanded(listener: () => void) {
  dashboardChildSidebarListeners.add(listener);
  return () => {
    dashboardChildSidebarListeners.delete(listener);
  };
}

function getDashboardChildSidebarExpandedSnapshot(): boolean {
  return rememberedDashboardChildSidebarExpanded;
}

function setRememberedDashboardChildSidebarExpanded(nextValue: boolean) {
  if (rememberedDashboardChildSidebarExpanded === nextValue) {
    return;
  }

  rememberedDashboardChildSidebarExpanded = nextValue;

  dashboardChildSidebarListeners.forEach((listener) => {
    listener();
  });
}

function resolveDesktopSidebarExpanded(
  sidebarVariant: "default" | "icon-rail",
  sidebarBehaviorScope: "home" | "child" | "other",
  rememberedChildSidebarExpanded: boolean
): boolean {
  if (sidebarBehaviorScope === "home") {
    return true;
  }

  if (sidebarBehaviorScope === "child") {
    return sidebarVariant === "icon-rail"
      ? rememberedChildSidebarExpanded
      : true;
  }

  if (sidebarVariant !== "icon-rail") {
    return true;
  }

  return false;
}

export default function DashboardShellFrame({
  auth,
  panelEyebrow,
  panelTitle,
  panelDescription,
  navGroups,
  workspaceMode,
  dualBusinessRoles,
  onWorkspaceChange,
  title,
  description,
  children,
  pageEyebrow,
  headerActions,
  headerVariant = "default",
  sidebarVariant = "default",
  sidebarBehaviorScope = "other",
}: DashboardShellFrameProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedContentRef = useRef(false);
  const hasMountedSidebarMotionRef = useRef(false);
  const rememberedChildSidebarExpanded = useSyncExternalStore(
    subscribeToDashboardChildSidebarExpanded,
    getDashboardChildSidebarExpandedSnapshot,
    getDashboardChildSidebarExpandedSnapshot
  );
  const isDesktopSidebarExpanded = resolveDesktopSidebarExpanded(
    sidebarVariant,
    sidebarBehaviorScope,
    rememberedChildSidebarExpanded
  );

  useSurfaceReveal(headerRef, {
    y: 6,
    duration: MOTION_DURATIONS.base,
  });

  useEffect(() => {
    if (sidebarBehaviorScope === "home") {
      setRememberedDashboardChildSidebarExpanded(false);
    }
  }, [sidebarBehaviorScope]);

  const isIconRail = sidebarVariant === "icon-rail";
  const desktopSidebarWidth = isIconRail
    ? isDesktopSidebarExpanded
      ? MOTION_LAYOUT.sidebarExpandedWidth
      : MOTION_LAYOUT.sidebarCollapsedWidth
    : MOTION_LAYOUT.sidebarExpandedWidth;
  const frameStyle = {
    "--dashboard-main-offset": `${desktopSidebarWidth}px`,
    "--dashboard-sidebar-width-current": `${desktopSidebarWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!frameRef.current) {
      return;
    }

    const nextWidth = isIconRail
      ? isDesktopSidebarExpanded
        ? MOTION_LAYOUT.sidebarExpandedWidth
        : MOTION_LAYOUT.sidebarCollapsedWidth
      : MOTION_LAYOUT.sidebarExpandedWidth;

    if (reducedMotion || !isIconRail || !hasMountedSidebarMotionRef.current) {
      gsap.set(frameRef.current, {
        "--dashboard-main-offset": `${nextWidth}px`,
        "--dashboard-sidebar-width-current": `${nextWidth}px`,
      });
      hasMountedSidebarMotionRef.current = true;
      return;
    }

    gsap.killTweensOf(frameRef.current);
    gsap.to(frameRef.current, {
      "--dashboard-main-offset": `${nextWidth}px`,
      "--dashboard-sidebar-width-current": `${nextWidth}px`,
      duration: MOTION_DURATIONS.panel,
      ease: MOTION_EASES.standard,
      overwrite: "auto",
    });
  }, [isDesktopSidebarExpanded, isIconRail, reducedMotion]);

  useEffect(() => {
    if (sidebarBehaviorScope === "home" || reducedMotion || !contentRef.current) {
      return;
    }

    const contentElement = contentRef.current;

    const runReveal = () => {
      if (hasAnimatedContentRef.current) {
        return;
      }

      const revealableChildren = Array.from(contentElement.children).filter(
        (child) => !(child as HTMLElement).hasAttribute("data-motion-skip")
      ) as HTMLElement[];

      if (revealableChildren.length === 0) {
        return;
      }

      hasAnimatedContentRef.current = true;

      gsap.from(revealableChildren, {
        autoAlpha: 0,
        y: 8,
        duration: MOTION_DURATIONS.base,
        ease: MOTION_EASES.standard,
        stagger: MOTION_STAGGERS.sections,
        clearProps: "opacity,transform,visibility",
      });
    };

    runReveal();

    const observer = new MutationObserver(() => {
      runReveal();
    });

    observer.observe(contentElement, {
      childList: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion, sidebarBehaviorScope]);

  const handleDesktopSidebarToggle = () => {
    if (sidebarBehaviorScope !== "child") {
      return;
    }

    setRememberedDashboardChildSidebarExpanded(!rememberedChildSidebarExpanded);
  };

  return (
    <div ref={frameRef} className="min-h-screen" style={frameStyle}>
      <DashboardTopbar
        auth={auth}
        workspaceMode={workspaceMode}
        onMenuToggle={() => setSidebarOpen((value) => !value)}
      />

      <DashboardSidebar
        panelEyebrow={panelEyebrow}
        panelTitle={panelTitle}
        panelDescription={panelDescription}
        navGroups={navGroups}
        workspaceMode={workspaceMode}
        dualBusinessRoles={dualBusinessRoles}
        onWorkspaceChange={onWorkspaceChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={sidebarVariant}
        isDesktopExpanded={isDesktopSidebarExpanded}
        onDesktopToggle={isIconRail ? handleDesktopSidebarToggle : undefined}
      />

      <div className="pt-[var(--topbar-height)] lg:pl-[var(--dashboard-main-offset)]">
        <main className="min-h-[calc(100vh-var(--topbar-height))] px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto max-w-7xl space-y-5">
            {headerVariant === "compact" ? (
              <div
                ref={headerRef}
                className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
              >
                <div className="space-y-1.5">
                  {(pageEyebrow ?? panelEyebrow) ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                      {pageEyebrow ?? panelEyebrow}
                    </p>
                  ) : null}
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                    {title}
                  </h1>
                  {description ? (
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  ) : null}
                </div>
                {headerActions ? (
                  <div className="self-start md:shrink-0">{headerActions}</div>
                ) : null}
              </div>
            ) : (
              <div
                ref={headerRef}
                className="app-surface-strong rounded-[1.75rem] p-5 md:p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    {(pageEyebrow ?? panelEyebrow) ? (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                        {pageEyebrow ?? panelEyebrow}
                      </p>
                    ) : null}
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                      {title}
                    </h1>
                    {description ? (
                      <p className="max-w-3xl text-sm leading-6 text-slate-600">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  {headerActions ? <div className="md:shrink-0">{headerActions}</div> : null}
                </div>
              </div>
            )}

            <div ref={contentRef}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
