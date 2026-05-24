"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Sistem erisilebilirlik tercihi degisirse hook kullanan animasyonlar yeniden hesaplanir.
function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const handleChange = () => {
    callback();
  };

  mediaQuery.addEventListener("change", handleChange);

  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}

// Browser yokken false snapshot doner; client'ta media query okunur.
function getReducedMotionSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// React'in external store API'siyle prefers-reduced-motion degeri guvenli izlenir.
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
}
