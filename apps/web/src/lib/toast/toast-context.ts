"use client";

import { createContext, useContext } from "react";
import type { ToastMessage } from "primereact/toast";

export type ShowToastFn = (message: ToastMessage) => void;

export const ToastContext = createContext<ShowToastFn | null>(null);

export function useToast(): ShowToastFn {
  const fn = useContext(ToastContext);
  if (!fn) {
    throw new Error("useToast must be used inside <Providers>");
  }
  return fn;
}
