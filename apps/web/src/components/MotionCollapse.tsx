"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap-client";
import {
  MOTION_DISTANCES,
  MOTION_DURATIONS,
  MOTION_EASES,
} from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type MotionCollapseProps = {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  onExpandComplete?: () => void;
};

export default function MotionCollapse({
  isOpen,
  children,
  className,
  onExpandComplete,
}: MotionCollapseProps) {
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current || !contentRef.current) {
      return;
    }

    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    const contentHeight = content.offsetHeight;

    if (reducedMotion) {
      gsap.set(wrapper, {
        height: isOpen ? "auto" : 0,
        autoAlpha: isOpen ? 1 : 0,
        overflow: "hidden",
      });
      gsap.set(content, {
        autoAlpha: isOpen ? 1 : 0,
        y: 0,
      });

      if (isOpen) {
        onExpandComplete?.();
      }

      return;
    }

    gsap.killTweensOf([wrapper, content]);

    if (isOpen) {
      gsap.set(wrapper, {
        height: 0,
        autoAlpha: 0,
        overflow: "hidden",
      });
      gsap.set(content, {
        autoAlpha: 0,
        y: MOTION_DISTANCES.childRevealY,
      });

      const timeline = gsap.timeline({
        defaults: {
          ease: MOTION_EASES.standard,
        },
      });

      timeline.to(wrapper, {
        height: contentHeight,
        autoAlpha: 1,
        duration: MOTION_DURATIONS.panel,
        onComplete: () => {
          gsap.set(wrapper, {
            height: "auto",
            overflow: "visible",
          });
          onExpandComplete?.();
        },
      });
      timeline.to(
        content,
        {
          autoAlpha: 1,
          y: 0,
          duration: MOTION_DURATIONS.base,
        },
        0.04
      );

      return;
    }

    gsap.set(wrapper, {
      height: contentHeight,
      autoAlpha: 1,
      overflow: "hidden",
    });
    gsap.set(content, {
      autoAlpha: 1,
      y: 0,
    });

    const timeline = gsap.timeline({
      defaults: {
        ease: MOTION_EASES.standard,
      },
    });

    timeline.to(content, {
      autoAlpha: 0,
      y: MOTION_DISTANCES.childRevealY,
      duration: MOTION_DURATIONS.quick,
    });
    timeline.to(
      wrapper,
      {
        height: 0,
        autoAlpha: 0,
        duration: MOTION_DURATIONS.panel,
      },
      0
    );
  }, [isOpen, onExpandComplete, reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden={!isOpen}
      className={className}
      style={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
