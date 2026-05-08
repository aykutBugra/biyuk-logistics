"use client";

import { useRef } from "react";
import { gsap } from "@/lib/motion/gsap-client";
import {
  MOTION_DISTANCES,
  MOTION_DURATIONS,
  MOTION_EASES,
} from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type OperationalCardMotionOptions = {
  disabled?: boolean;
};

function canAnimateHover() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export function useOperationalCardMotion<T extends HTMLElement>({
  disabled = false,
}: OperationalCardMotionOptions = {}) {
  const reducedMotion = useReducedMotion();
  const elementRef = useRef<T | null>(null);
  const isHoveredRef = useRef(false);

  const animateTo = (y: number) => {
    if (disabled || reducedMotion || !elementRef.current) {
      return;
    }

    gsap.killTweensOf(elementRef.current);
    gsap.to(elementRef.current, {
      y,
      duration: y === 0 ? MOTION_DURATIONS.hover : MOTION_DURATIONS.press,
      ease: MOTION_EASES.standard,
      overwrite: "auto",
    });
  };

  return {
    elementRef,
    motionProps: {
      onMouseEnter: () => {
        if (!canAnimateHover()) {
          return;
        }

        isHoveredRef.current = true;
        animateTo(MOTION_DISTANCES.hoverLiftY);
      },
      onMouseLeave: () => {
        isHoveredRef.current = false;
        animateTo(0);
      },
      onPointerDown: () => {
        if (!isHoveredRef.current) {
          return;
        }

        animateTo(MOTION_DISTANCES.pressLiftY);
      },
      onPointerUp: () => {
        animateTo(isHoveredRef.current ? MOTION_DISTANCES.hoverLiftY : 0);
      },
      onPointerCancel: () => {
        animateTo(isHoveredRef.current ? MOTION_DISTANCES.hoverLiftY : 0);
      },
    },
  };
}
