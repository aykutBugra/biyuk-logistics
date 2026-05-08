"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DASHBOARD_HELP_CONTENT,
  type DashboardHelpKey,
} from "@/lib/dashboard/help-content";
import { gsap } from "@/lib/motion/gsap-client";
import {
  MOTION_DISTANCES,
  MOTION_DURATIONS,
  MOTION_EASES,
} from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type InlineHelpTriggerProps = {
  helpKey: DashboardHelpKey;
  buttonLabel?: string;
};

type HelpPanelPlacement = "above" | "below";

type HelpPanelStyle = {
  top: number;
  left: number;
  width: number;
  ready: boolean;
  placement: HelpPanelPlacement;
};

const DEFAULT_PANEL_STYLE: HelpPanelStyle = {
  top: 0,
  left: 0,
  width: 352,
  ready: false,
  placement: "below",
};

export default function InlineHelpTrigger({
  helpKey,
  buttonLabel = "Yardim",
}: InlineHelpTriggerProps) {
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const panelTitleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPresent, setIsPresent] = useState(false);
  const [panelStyle, setPanelStyle] = useState<HelpPanelStyle>(
    DEFAULT_PANEL_STYLE
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedOpenRef = useRef(false);
  const content = DASHBOARD_HELP_CONTENT[helpKey];

  const updatePanelPosition = useCallback(() => {
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
      placement: shouldOpenAbove ? "above" : "below",
    });
  }, []);

  const closePanel = useCallback(() => {
    if (!isPresent) {
      return;
    }

    setIsOpen(false);
    hasAnimatedOpenRef.current = false;

    const panel = panelRef.current;

    if (reducedMotion || !panel) {
      setIsPresent(false);
      setPanelStyle(DEFAULT_PANEL_STYLE);
      return;
    }

    const exitY =
      panelStyle.placement === "above"
        ? -(MOTION_DISTANCES.overlayRevealY / 2)
        : MOTION_DISTANCES.overlayRevealY / 2;

    gsap.killTweensOf(panel);
    gsap.to(panel, {
      autoAlpha: 0,
      y: exitY,
      duration: MOTION_DURATIONS.overlayExit,
      ease: MOTION_EASES.standard,
      overwrite: "auto",
      onComplete: () => {
        setIsPresent(false);
        setPanelStyle(DEFAULT_PANEL_STYLE);
      },
    });
  }, [isPresent, panelStyle.placement, reducedMotion]);

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
        closePanel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closePanel, isOpen]);

  useLayoutEffect(() => {
    if (!isPresent || !isOpen) {
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
  }, [isOpen, isPresent, updatePanelPosition]);

  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!panel || !isPresent || !isOpen || !panelStyle.ready) {
      return;
    }

    if (hasAnimatedOpenRef.current) {
      return;
    }

    hasAnimatedOpenRef.current = true;

    if (reducedMotion) {
      gsap.set(panel, {
        autoAlpha: 1,
        y: 0,
      });
      return;
    }

    const entryY =
      panelStyle.placement === "above"
        ? -MOTION_DISTANCES.overlayRevealY
        : MOTION_DISTANCES.overlayRevealY;

    gsap.killTweensOf(panel);
    gsap.set(panel, {
      autoAlpha: 0,
      y: entryY,
    });
    gsap.to(panel, {
      autoAlpha: 1,
      y: 0,
      duration: MOTION_DURATIONS.overlayEnter,
      ease: MOTION_EASES.standard,
      overwrite: "auto",
    });
  }, [isOpen, isPresent, panelStyle.placement, panelStyle.ready, reducedMotion]);

  useEffect(() => {
    const panel = panelRef.current;

    return () => {
      if (panel) {
        gsap.killTweensOf(panel);
      }
    };
  }, [isPresent]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (isOpen) {
            closePanel();
            return;
          }

          if (panelRef.current) {
            gsap.killTweensOf(panelRef.current);
          }

          hasAnimatedOpenRef.current = false;
          setPanelStyle(DEFAULT_PANEL_STYLE);
          setIsPresent(true);
          setIsOpen(true);
        }}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={buttonLabel}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition ${
          isOpen
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        }`}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-black transition ${
            isOpen
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          i
        </span>
        <span>{buttonLabel}</span>
      </button>

      {isPresent
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[70]">
              <div
                id={panelId}
                ref={panelRef}
                role="dialog"
                aria-modal="false"
                aria-labelledby={panelTitleId}
                className="pointer-events-auto fixed rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/12"
                style={{
                  top: `${panelStyle.top}px`,
                  left: `${panelStyle.left}px`,
                  width: `${panelStyle.width}px`,
                  opacity: panelStyle.ready ? 1 : 0,
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Bu bolum hakkinda
                </p>
                <h3
                  id={panelTitleId}
                  className="mt-2 text-lg font-black tracking-tight text-slate-950"
                >
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
