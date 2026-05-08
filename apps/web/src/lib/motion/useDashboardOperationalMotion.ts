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

type DashboardOperationalMotionOptions = {
  enabled?: boolean;
  routeTransitionId: string;
  cardMotionLimit?: number;
};

export function useDashboardOperationalMotion(
  contentRef: RefObject<HTMLElement | null>,
  {
    enabled = false,
    routeTransitionId,
    cardMotionLimit = 6,
  }: DashboardOperationalMotionOptions
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

      const statsTarget =
        contentElement.querySelector<HTMLElement>("[data-dashboard-stats]");
      const primaryTarget =
        contentElement.querySelector<HTMLElement>("[data-dashboard-primary]");

      if (!statsTarget && !primaryTarget) {
        return false;
      }

      hasAnimatedRef.current = true;

      const cardTargets = primaryTarget
        ? Array.from(
            primaryTarget.querySelectorAll<HTMLElement>("[data-dashboard-card]")
          ).slice(0, cardMotionLimit)
        : [];

      gsap.killTweensOf([
        ...(statsTarget ? [statsTarget] : []),
        ...(primaryTarget ? [primaryTarget] : []),
        ...cardTargets,
      ]);

      if (statsTarget) {
        gsap.set(statsTarget, {
          autoAlpha: 0,
          y: MOTION_DISTANCES.routeRevealY,
        });
      }

      if (primaryTarget) {
        gsap.set(primaryTarget, {
          autoAlpha: 0,
          y: MOTION_DISTANCES.routeRevealY,
        });
      }

      if (cardTargets.length > 0) {
        gsap.set(cardTargets, {
          autoAlpha: 0,
          y: MOTION_DISTANCES.childRevealY,
        });
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: MOTION_EASES.standard,
        },
      });

      if (statsTarget) {
        timeline.to(statsTarget, {
          autoAlpha: 1,
          y: 0,
          duration: MOTION_DURATIONS.quick,
          clearProps: "opacity,transform,visibility",
        });
      }

      if (primaryTarget) {
        timeline.to(
          primaryTarget,
          {
            autoAlpha: 1,
            y: 0,
            duration: MOTION_DURATIONS.base,
            clearProps: "opacity,transform,visibility",
          },
          statsTarget ? 0.06 : 0
        );
      }

      if (cardTargets.length > 0) {
        timeline.to(
          cardTargets,
          {
            autoAlpha: 1,
            y: 0,
            duration: MOTION_DURATIONS.quick,
            stagger: MOTION_STAGGERS.cardsTight,
            clearProps: "opacity,transform,visibility",
          },
          statsTarget ? 0.12 : 0.05
        );
      }

      return true;
    };

    if (runReveal()) {
      return () => {
        gsap.killTweensOf(contentElement.querySelectorAll("[data-dashboard-card]"));
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
      gsap.killTweensOf(contentElement.querySelectorAll("[data-dashboard-card]"));
    };
  }, [cardMotionLimit, contentRef, enabled, reducedMotion, routeTransitionId]);
}
