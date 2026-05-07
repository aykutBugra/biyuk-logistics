"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "@/lib/motion/gsap-client";
import { MOTION_DISTANCES, MOTION_DURATIONS, MOTION_EASES } from "@/lib/motion/motion-tokens";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

type DashboardActionCardProps = {
  href: string;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
  variant?: "default" | "shortcut" | "quiet";
};

function canAnimateHover() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export default function DashboardActionCard({
  href,
  eyebrow,
  title,
  description,
  meta,
  variant = "default",
}: DashboardActionCardProps) {
  const reducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  const handleHoverMotion = (isActive: boolean) => {
    if (reducedMotion || !canAnimateHover() || !cardRef.current) {
      return;
    }

    gsap.killTweensOf(cardRef.current);
    gsap.to(cardRef.current, {
      y: isActive ? MOTION_DISTANCES.hoverLiftY : 0,
      duration: MOTION_DURATIONS.hover,
      ease: MOTION_EASES.standard,
      overwrite: "auto",
    });
  };

  if (variant === "shortcut") {
    return (
      <Link
        ref={cardRef}
        href={href}
        data-motion-shortcut-card
        onMouseEnter={() => handleHoverMotion(true)}
        onMouseLeave={() => handleHoverMotion(false)}
        className="app-surface-strong group flex min-h-0 items-center justify-between gap-3 rounded-[1.2rem] px-4 py-3 transition-colors will-change-transform hover:border-blue-200"
      >
        <h2 className="text-sm font-bold tracking-tight text-slate-950 transition-colors group-hover:text-blue-700 md:text-[0.95rem]">
          {title}
        </h2>
        <i className="pi pi-arrow-up-right text-sm text-slate-300 transition-colors group-hover:text-blue-500" />
      </Link>
    );
  }

  if (variant === "quiet") {
    return (
      <Link
        ref={cardRef}
        href={href}
        onMouseEnter={() => handleHoverMotion(true)}
        onMouseLeave={() => handleHoverMotion(false)}
        className="app-surface group flex min-h-0 items-center justify-between gap-3 rounded-[1.1rem] px-3.5 py-3 transition-colors will-change-transform hover:border-slate-300"
      >
        <h2 className="text-sm font-semibold tracking-tight text-slate-700 transition-colors group-hover:text-slate-950">
          {title}
        </h2>
        {meta ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            {meta}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      ref={cardRef}
      href={href}
      onMouseEnter={() => handleHoverMotion(true)}
      onMouseLeave={() => handleHoverMotion(false)}
      className="app-surface-strong group rounded-[1.45rem] p-4 transition-colors will-change-transform hover:border-blue-200"
    >
      <div className="flex items-start justify-between gap-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            {eyebrow}
          </p>
        ) : (
          <span />
        )}
        {meta ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {meta}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2.5 text-base font-black tracking-tight text-slate-950 transition-colors group-hover:text-blue-700 md:text-lg">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </Link>
  );
}
