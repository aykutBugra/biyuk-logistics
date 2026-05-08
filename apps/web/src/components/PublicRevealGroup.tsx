"use client";

import type { HTMLAttributes } from "react";
import { useRef } from "react";
import { useSurfaceReveal } from "@/lib/motion/useSurfaceReveal";

type PublicRevealGroupProps = {
  rememberKey: string;
  delay?: number;
  childSelector?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function PublicRevealGroup({
  rememberKey,
  delay,
  childSelector,
  className,
  children,
  ...divProps
}: PublicRevealGroupProps) {
  const groupRef = useRef<HTMLDivElement | null>(null);

  useSurfaceReveal(groupRef, {
    rememberKey,
    delay,
    childSelector,
  });

  return (
    <div ref={groupRef} className={className} {...divProps}>
      {children}
    </div>
  );
}
