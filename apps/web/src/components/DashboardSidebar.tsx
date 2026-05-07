"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/motion/gsap-client";
import { MOTION_DISTANCES, MOTION_DURATIONS, MOTION_EASES } from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import type { DashboardRenderedNavGroup } from "@/lib/dashboard/navigation";
import type { StoredDashboardWorkspaceMode } from "@/lib/auth/auth-storage";

type DashboardSidebarProps = {
  panelEyebrow?: string;
  panelTitle: string;
  panelDescription?: string;
  navGroups: DashboardRenderedNavGroup[];
  workspaceMode: StoredDashboardWorkspaceMode | null;
  dualBusinessRoles: boolean;
  onWorkspaceChange: (mode: StoredDashboardWorkspaceMode) => void;
  isOpen?: boolean;
  onClose?: () => void;
  extraPanelContent?: ReactNode;
  variant?: "default" | "icon-rail";
  isDesktopExpanded?: boolean;
  onDesktopToggle?: () => void;
};

export default function DashboardSidebar({
  panelEyebrow,
  panelTitle,
  panelDescription,
  navGroups,
  workspaceMode,
  dualBusinessRoles,
  onWorkspaceChange,
  isOpen = false,
  onClose,
  extraPanelContent,
  variant = "default",
  isDesktopExpanded = true,
  onDesktopToggle,
}: DashboardSidebarProps) {
  const reducedMotion = useReducedMotion();
  const asideRef = useRef<HTMLElement | null>(null);
  const isIconRailCollapsed = variant === "icon-rail" && !isDesktopExpanded;

  useGSAP(
    () => {
      const textNodes =
        asideRef.current?.querySelectorAll<HTMLElement>("[data-sidebar-text]");

      if (!textNodes?.length) {
        return;
      }

      gsap.killTweensOf(textNodes);

      const nextAutoAlpha = isIconRailCollapsed ? 0 : 1;
      const nextX = isIconRailCollapsed ? MOTION_DISTANCES.sidebarTextX : 0;

      if (reducedMotion) {
        gsap.set(textNodes, {
          autoAlpha: nextAutoAlpha,
          x: nextX,
        });
        return;
      }

      gsap.to(textNodes, {
        autoAlpha: nextAutoAlpha,
        x: nextX,
        duration: MOTION_DURATIONS.quick,
        ease: MOTION_EASES.standard,
        overwrite: "auto",
        stagger: isIconRailCollapsed ? 0 : 0.01,
      });
    },
    {
      scope: asideRef,
      dependencies: [isIconRailCollapsed, reducedMotion],
    }
  );

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/32 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        ref={asideRef}
        className={`fixed bottom-0 left-0 top-[var(--topbar-height)] z-30 flex w-[var(--sidebar-width)] flex-col overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] backdrop-blur-xl transition-transform duration-200 ${
          variant === "icon-rail"
            ? "lg:w-[var(--dashboard-sidebar-width-current)]"
            : "lg:w-[var(--sidebar-width)]"
        } ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div
          className={`border-b border-slate-100/80 ${
            isIconRailCollapsed ? "px-5 py-5 lg:px-3 lg:py-4" : "px-5 py-5"
          }`}
        >
          {variant === "icon-rail" && onDesktopToggle ? (
            <div
              className={`flex ${
                isIconRailCollapsed ? "justify-center" : "justify-end"
              }`}
            >
              <button
                type="button"
                onClick={onDesktopToggle}
                className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-500 transition hover:bg-white hover:text-slate-900 lg:inline-flex"
                aria-label={
                  isIconRailCollapsed ? "Menüyü genişlet" : "Menüyü daralt"
                }
                title={
                  isIconRailCollapsed ? "Menüyü genişlet" : "Menüyü daralt"
                }
              >
                <i
                  className={`pi ${
                    isIconRailCollapsed ? "pi-angle-right" : "pi-angle-left"
                  } text-sm`}
                />
              </button>
            </div>
          ) : null}

          <div
            className={`overflow-hidden transition-[max-height] duration-200 ${
              isIconRailCollapsed ? "lg:max-h-0" : "lg:max-h-40"
            }`}
          >
            <div data-sidebar-text>
              {panelEyebrow ? (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                  {panelEyebrow}
                </p>
              ) : null}
              <p className="text-lg font-black tracking-tight text-slate-950">
                {panelTitle}
              </p>
              {panelDescription ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {panelDescription}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {dualBusinessRoles ? (
          <div
            className={`border-b border-slate-100/80 ${
              isIconRailCollapsed ? "px-4 py-4 lg:px-3" : "px-4 py-4"
            }`}
          >
            {isIconRailCollapsed ? (
              <>
                <div className="hidden flex-col gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => onWorkspaceChange("customer")}
                    className={`inline-flex h-10 items-center justify-center rounded-2xl text-xs font-semibold transition ${
                      workspaceMode === "customer"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                    aria-label="Müşteri alanına geç"
                    title="Müşteri alanına geç"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => onWorkspaceChange("carrier")}
                    className={`inline-flex h-10 items-center justify-center rounded-2xl text-xs font-semibold transition ${
                      workspaceMode === "carrier"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                    aria-label="Nakliyeci alanına geç"
                    title="Nakliyeci alanına geç"
                  >
                    N
                  </button>
                </div>

                <div className="space-y-3 lg:hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    İş alanı
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onWorkspaceChange("customer")}
                      className={`rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
                        workspaceMode === "customer"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-white/70 text-slate-600 hover:bg-white"
                      }`}
                    >
                      Müşteri
                    </button>
                    <button
                      type="button"
                      onClick={() => onWorkspaceChange("carrier")}
                      className={`rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
                        workspaceMode === "carrier"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-white/70 text-slate-600 hover:bg-white"
                      }`}
                    >
                      Nakliyeci
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  İş alanı
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onWorkspaceChange("customer")}
                    className={`rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
                      workspaceMode === "customer"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Müşteri
                  </button>
                  <button
                    type="button"
                    onClick={() => onWorkspaceChange("carrier")}
                    className={`rounded-2xl px-3 py-2.5 text-xs font-semibold transition ${
                      workspaceMode === "carrier"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    Nakliyeci
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <nav className={`flex-1 ${isIconRailCollapsed ? "px-3 py-4 lg:px-2" : "px-3 py-4"}`}>
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.id}
              className={
                groupIndex > 0
                  ? isIconRailCollapsed
                    ? "mt-5 lg:mt-4 lg:border-t lg:border-slate-100/70 lg:pt-4"
                    : "mt-5"
                  : ""
              }
            >
              {group.title ? (
                <div
                  className={`overflow-hidden transition-[max-height,margin] duration-200 ${
                    isIconRailCollapsed ? "lg:mb-0 lg:max-h-0" : "lg:max-h-8"
                  }`}
                >
                  <p
                    data-sidebar-text
                    className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400"
                  >
                    {group.title}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-label={item.label}
                    title={isIconRailCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-2xl text-sm font-semibold transition-colors ${
                      isIconRailCollapsed
                        ? "gap-0 px-3 py-3 lg:justify-center lg:px-2"
                        : "gap-3 px-3 py-3"
                    } ${
                      item.isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200/60"
                        : "bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {item.icon ? (
                      <i
                        className={`${item.icon} w-4 shrink-0 text-center text-base ${
                          item.isActive ? "text-white" : "text-slate-400"
                        }`}
                      />
                    ) : null}
                    <span
                      data-sidebar-text
                      className={`block overflow-hidden whitespace-nowrap transition-[max-width] duration-200 ${
                        isIconRailCollapsed ? "lg:max-w-0" : "lg:max-w-[11rem]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {extraPanelContent ? (
          <div
            className={`border-t border-slate-100/80 px-4 py-4 ${
              isIconRailCollapsed ? "lg:hidden" : ""
            }`}
          >
            {extraPanelContent}
          </div>
        ) : null}
      </aside>
    </>
  );
}
