"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import type { DashboardHelpKey } from "@/lib/dashboard/help-content";
import { useSurfaceReveal } from "@/lib/motion/useSurfaceReveal";

type DashboardHomeSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  helpKey?: DashboardHelpKey;
  headerActions?: ReactNode;
  children: ReactNode;
  density?: "default" | "compact";
  motionId?: string;
  motionPreset?: "default" | "shortcut-grid";
};

export default function DashboardHomeSection({
  eyebrow,
  title,
  description,
  helpKey,
  headerActions,
  children,
  density = "default",
  motionId,
  motionPreset = "default",
}: DashboardHomeSectionProps) {
  const isCompact = density === "compact";
  const sectionRef = useRef<HTMLElement | null>(null);

  useSurfaceReveal(sectionRef, {
    rememberKey: motionId,
    childSelector:
      motionPreset === "shortcut-grid"
        ? "[data-motion-shortcut-card]"
        : undefined,
  });

  return (
    <section
      ref={sectionRef}
      className={`app-surface ${
        isCompact ? "rounded-[1.45rem] p-4" : "rounded-[1.6rem] p-4 md:p-5"
      }`}
    >
      <div
        className={`flex flex-col lg:flex-row lg:items-start lg:justify-between ${
          isCompact ? "gap-2.5" : "gap-3"
        }`}
      >
        <div className="space-y-1.5">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`font-black tracking-tight text-slate-950 ${
              isCompact ? "text-lg md:text-[1.55rem]" : "text-xl md:text-2xl"
            }`}
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {headerActions || helpKey ? (
          <div className="flex items-start gap-2 self-start">
            {headerActions}
            {helpKey ? <InlineHelpTrigger helpKey={helpKey} /> : null}
          </div>
        ) : null}
      </div>
      <div className={isCompact ? "mt-3.5" : "mt-4"}>{children}</div>
    </section>
  );
}
