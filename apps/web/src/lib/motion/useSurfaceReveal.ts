"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap-client";
import {
  MOTION_DISTANCES,
  MOTION_DURATIONS,
  MOTION_EASES,
  MOTION_STAGGERS,
} from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type SurfaceRevealOptions = {
  disabled?: boolean;
  rememberKey?: string;
  delay?: number;
  y?: number;
  duration?: number;
  childSelector?: string;
  childY?: number;
  childDuration?: number;
  childStagger?: number;
};

const revealedMotionKeys = new Set<string>();

// Tekil yuzey veya icindeki cocuk kartlar icin tekrar etmeyen reveal animasyonu saglar.
export function useSurfaceReveal(
  targetRef: RefObject<HTMLElement | null>,
  {
    disabled = false,
    rememberKey,
    delay = 0,
    y = MOTION_DISTANCES.surfaceRevealY,
    duration = MOTION_DURATIONS.base,
    childSelector,
    childY = MOTION_DISTANCES.childRevealY,
    childDuration = MOTION_DURATIONS.quick,
    childStagger = MOTION_STAGGERS.cards,
  }: SurfaceRevealOptions = {}
) {
  const reducedMotion = useReducedMotion();
  const hasAnimatedRef = useRef(false);

  useGSAP(
    () => {
      const target = targetRef.current;

      // Animasyon kapaliysa veya kullanici reduced motion istiyorsa DOM'a dokunulmaz.
      if (!target || disabled || reducedMotion || hasAnimatedRef.current) {
        return;
      }

      // rememberKey verilirse ayni yuzey session boyunca ikinci kez animasyon oynamaz.
      if (rememberKey && revealedMotionKeys.has(rememberKey)) {
        hasAnimatedRef.current = true;
        return;
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: MOTION_EASES.standard,
        },
      });

      timeline.from(target, {
        autoAlpha: 0,
        y,
        duration,
        delay,
        clearProps: "opacity,transform,visibility",
      });

      if (childSelector) {
        const childTargets = target.querySelectorAll<HTMLElement>(childSelector);

        // Child selector verilirse ana yuzeyden sonra kartlar/listeler sirayla gorunur.
        if (childTargets.length > 0) {
          timeline.from(
            childTargets,
            {
              autoAlpha: 0,
              y: childY,
              duration: childDuration,
              stagger: childStagger,
              clearProps: "opacity,transform,visibility",
            },
            delay + 0.04
          );
        }
      }

      if (rememberKey) {
        revealedMotionKeys.add(rememberKey);
      }

      hasAnimatedRef.current = true;
    },
    {
      scope: targetRef,
      dependencies: [
        childDuration,
        childSelector,
        childStagger,
        childY,
        delay,
        disabled,
        duration,
        reducedMotion,
        rememberKey,
        y,
      ],
    }
  );
}
