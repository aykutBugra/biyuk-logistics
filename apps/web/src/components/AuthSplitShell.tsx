"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { useSurfaceReveal } from "@/lib/motion/useSurfaceReveal";

type AuthSplitShellProps = {
  hero: ReactNode;
  card: ReactNode;
  rememberKey: string;
  gridClassName: string;
  heroClassName?: string;
  cardClassName?: string;
  cardChildSelector?: string;
};

export default function AuthSplitShell({
  hero,
  card,
  rememberKey,
  gridClassName,
  heroClassName = "app-surface rounded-[1.25rem] p-7 md:p-8",
  cardClassName = "app-surface-strong rounded-[1.25rem] p-7 md:p-8",
  cardChildSelector = "[data-auth-card-step]",
}: AuthSplitShellProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

  useSurfaceReveal(heroRef, {
    rememberKey: `${rememberKey}-hero`,
    delay: 0.04,
  });
  useSurfaceReveal(cardRef, {
    rememberKey: `${rememberKey}-card`,
    childSelector: cardChildSelector,
  });

  return (
    <main className="px-4 py-10 md:py-14">
      <div className={`mx-auto grid gap-6 ${gridClassName}`}>
        <section ref={heroRef} className={heroClassName}>
          {hero}
        </section>
        <section ref={cardRef} className={cardClassName}>
          {card}
        </section>
      </div>
    </main>
  );
}
