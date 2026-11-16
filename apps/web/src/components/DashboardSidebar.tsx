"use client";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { DashboardRenderedNavGroup } from "@/lib/dashboard/navigation";
import type { StoredDashboardWorkspaceMode } from "@/lib/auth/auth-storage";
import styles from "./control-center.module.css";

type DashboardSidebarProps = {
  panelEyebrow?: string; panelTitle: string; panelDescription?: string;
  navGroups: DashboardRenderedNavGroup[];
  workspaceMode: StoredDashboardWorkspaceMode | null; dualBusinessRoles: boolean;
  onWorkspaceChange: (mode: StoredDashboardWorkspaceMode) => void;
  isOpen?: boolean; onClose?: () => void; extraPanelContent?: ReactNode;
  variant?: "default" | "icon-rail"; isDesktopExpanded?: boolean; onDesktopToggle?: () => void;
};
export default function DashboardSidebar({
  panelTitle, navGroups, workspaceMode, dualBusinessRoles, onWorkspaceChange,
  isOpen = false, onClose, extraPanelContent, variant = "default",
  isDesktopExpanded = true, onDesktopToggle,
}: DashboardSidebarProps) {
  const asideRef = useRef<HTMLElement | null>(null);
  const collapsed = variant === "icon-rail" && !isDesktopExpanded;
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => { if (asideRef.current) asideRef.current.inert = !isOpen && !media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || window.matchMedia("(min-width: 1024px)").matches) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    asideRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      if (event.key === "Escape") onClose?.();
      if (event.key !== "Tab") return;
      const items = Array.from(asideRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? []).filter((item) => item.getClientRects().length > 0);
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [isOpen, onClose]);
  return (
    <>
      {isOpen ? <div className={styles.backdrop} onClick={onClose} aria-hidden="true" /> : null}
      <aside id="dashboard-navigation" ref={asideRef} aria-label={panelTitle}
        className={[styles.sidebar, collapsed ? styles.collapsed : "", isOpen ? styles.sidebarOpen : ""].join(" ")}>
        <div className={styles.workspaceBar}>
          {dualBusinessRoles ? (
            <div className={styles.roleSwitch} role="group" aria-label="İş alanı seçimi">
              {(["customer", "carrier"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => onWorkspaceChange(mode)}
                  aria-pressed={workspaceMode === mode} aria-label={mode === "customer" ? "Müşteri alanı" : "Nakliyeci alanı"}
                  title={mode === "customer" ? "Müşteri alanı" : "Nakliyeci alanı"}>
                  <i className={"pi " + (mode === "customer" ? "pi-user" : "pi-truck")} aria-hidden="true" />
                  <span className={styles.navLabel}>{mode === "customer" ? "Müşteri" : "Nakliyeci"}</span>
                </button>
              ))}
            </div>
          ) : <p className={styles.singleWorkspace}><i className="pi pi-briefcase" aria-hidden="true" /><span className={styles.navLabel}>{workspaceMode === "carrier" ? "Nakliyeci" : workspaceMode === "customer" ? "Müşteri" : panelTitle}</span></p>}
          <button type="button" onClick={onClose} className={styles.mobileClose} aria-label="Menüyü kapat"><i className="pi pi-times" aria-hidden="true" /></button>
        </div>
        <nav className={styles.navigation} aria-label="Ana menü">
          {navGroups.map((group, index) => (
            <div key={group.id} className={styles.navGroup}>
              {index > 0 && group.title ? <p className={styles.groupTitle + " " + styles.navLabel}>{group.title}</p> : null}
              {group.items.map((item) => (
                <Link key={item.id} href={item.href} onClick={onClose} aria-label={item.label}
                  aria-current={item.isActive ? "page" : undefined} title={collapsed ? item.label : undefined}
                  className={styles.navItem + " " + (item.isActive ? styles.navActive : "")}>
                  {item.icon ? <i className={item.icon} aria-hidden="true" /> : null}
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.isActive ? <span className={styles.activeDot} aria-hidden="true" /> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        {extraPanelContent ? <div className={styles.extraPanel + " " + styles.navLabel}>{extraPanelContent}</div> : null}
        {variant === "icon-rail" && onDesktopToggle ? (
          <button type="button" onClick={onDesktopToggle} className={styles.collapseControl}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"} title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
            <i className={"pi " + (collapsed ? "pi-angle-double-right" : "pi-angle-double-left")} aria-hidden="true" />
            <span className={styles.navLabel}>Menüyü daralt</span>
          </button>
        ) : null}
      </aside>
    </>
  );
}
