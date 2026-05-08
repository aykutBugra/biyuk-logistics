"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap-client";
import {
  MOTION_DISTANCES,
  MOTION_DURATIONS,
  MOTION_EASES,
  MOTION_STAGGERS,
} from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type DashboardFormMotionOptions = {
  enabled?: boolean;
  routeTransitionId: string;
};

export function useDashboardFormMotion(
  contentRef: RefObject<HTMLElement | null>,
  { enabled = false, routeTransitionId }: DashboardFormMotionOptions
) {
  const reducedMotion = useReducedMotion();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    hasAnimatedRef.current = false;
  }, [routeTransitionId]);

  useEffect(() => {
    const contentElement = contentRef.current;

    if (!enabled || reducedMotion || !contentElement) {
      return;
    }

    let observer: MutationObserver | null = null;

    const runReveal = () => {
      if (hasAnimatedRef.current) {
        return true;
      }

      const formSurface = contentElement.querySelector<HTMLElement>(
        "[data-dashboard-form-surface]"
      );

      if (!formSurface) {
        return false;
      }

      hasAnimatedRef.current = true;

      const sectionTargets = Array.from(
        formSurface.querySelectorAll<HTMLElement>("[data-dashboard-form-section]")
      );
      const submitTarget = formSurface.querySelector<HTMLElement>(
        "[data-dashboard-form-submit]"
      );

      gsap.killTweensOf([
        formSurface,
        ...sectionTargets,
        ...(submitTarget ? [submitTarget] : []),
      ]);

      gsap.set(formSurface, {
        autoAlpha: 0,
        y: MOTION_DISTANCES.routeRevealY,
      });

      if (sectionTargets.length > 0) {
        gsap.set(sectionTargets, {
          autoAlpha: 0,
          y: MOTION_DISTANCES.childRevealY,
        });
      }

      if (submitTarget) {
        gsap.set(submitTarget, {
          autoAlpha: 0,
          y: MOTION_DISTANCES.childRevealY,
        });
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: MOTION_EASES.standard,
        },
      });

      timeline.to(formSurface, {
        autoAlpha: 1,
        y: 0,
        duration: MOTION_DURATIONS.base,
        clearProps: "opacity,transform,visibility",
      });

      if (sectionTargets.length > 0) {
        timeline.to(
          sectionTargets,
          {
            autoAlpha: 1,
            y: 0,
            duration: MOTION_DURATIONS.quick,
            stagger: MOTION_STAGGERS.formSections,
            clearProps: "opacity,transform,visibility",
          },
          0.06
        );
      }

      if (submitTarget) {
        timeline.to(
          submitTarget,
          {
            autoAlpha: 1,
            y: 0,
            duration: MOTION_DURATIONS.quick,
            clearProps: "opacity,transform,visibility",
          },
          sectionTargets.length > 0 ? 0.14 : 0.08
        );
      }

      return true;
    };

    if (runReveal()) {
      return () => {
        gsap.killTweensOf(
          contentElement.querySelectorAll("[data-dashboard-form-section]")
        );
      };
    }

    observer = new MutationObserver(() => {
      if (runReveal()) {
        observer?.disconnect();
      }
    });

    observer.observe(contentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer?.disconnect();
      gsap.killTweensOf(
        contentElement.querySelectorAll("[data-dashboard-form-section]")
      );
    };
  }, [contentRef, enabled, reducedMotion, routeTransitionId]);
}
