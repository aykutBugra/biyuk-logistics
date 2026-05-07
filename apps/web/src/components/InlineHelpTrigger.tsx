"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DASHBOARD_HELP_CONTENT,
  type DashboardHelpKey,
} from "@/lib/dashboard/help-content";

type InlineHelpTriggerProps = {
  helpKey: DashboardHelpKey;
  buttonLabel?: string;
};

type HelpPanelStyle = {
  top: number;
  left: number;
  width: number;
  ready: boolean;
};

const DEFAULT_PANEL_STYLE: HelpPanelStyle = {
  top: 0,
  left: 0,
  width: 352,
  ready: false,
};

export default function InlineHelpTrigger({
  helpKey,
  buttonLabel = "Yardım",
}: InlineHelpTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<HelpPanelStyle>(
    DEFAULT_PANEL_STYLE
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const content = DASHBOARD_HELP_CONTENT[helpKey];

  const updatePanelPosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const viewportPadding = 16;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const nextWidth = Math.min(352, window.innerWidth - viewportPadding * 2);
    const nextLeft = Math.min(
      Math.max(triggerRect.right - nextWidth, viewportPadding),
      window.innerWidth - nextWidth - viewportPadding
    );
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const preferredTop = triggerRect.bottom + 12;
    const maxTop = Math.max(
      viewportPadding,
      window.innerHeight - panelHeight - viewportPadding
    );
    const shouldOpenAbove =
      panelHeight > 0 &&
      preferredTop + panelHeight > window.innerHeight - viewportPadding &&
      triggerRect.top - panelHeight - 12 >= viewportPadding;
    const nextTop = shouldOpenAbove
      ? triggerRect.top - panelHeight - 12
      : Math.min(preferredTop, maxTop);

    setPanelStyle({
      top: nextTop,
      left: nextLeft,
      width: nextWidth,
      ready: true,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;

      if (
        !containerRef.current?.contains(targetNode) &&
        !panelRef.current?.contains(targetNode)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePanelPosition();

    const handleViewportChange = () => {
      updatePanelPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            setPanelStyle(DEFAULT_PANEL_STYLE);
          }

          setIsOpen((currentState) => !currentState);
        }}
        aria-expanded={isOpen}
        aria-label={buttonLabel}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
          i
        </span>
        <span>{buttonLabel}</span>
      </button>

      {isOpen
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[70]">
              <div
                ref={panelRef}
                className="pointer-events-auto fixed rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/12"
                style={{
                  top: `${panelStyle.top}px`,
                  left: `${panelStyle.left}px`,
                  width: `${panelStyle.width}px`,
                  opacity: panelStyle.ready ? 1 : 0,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Bu bölüm hakkında
                </p>
                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {content.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {content.description}
                </p>
                {content.bullets?.length ? (
                  <div className="mt-4 space-y-2">
                    {content.bullets.map((bullet) => (
                      <p key={bullet} className="text-sm leading-6 text-slate-600">
                        - {bullet}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
