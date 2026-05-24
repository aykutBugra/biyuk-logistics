"use client";

import { createContext, useContext } from "react";
import type { ToastMessage } from "primereact/toast";

export type ShowToastFn = (message: ToastMessage) => void;

// PrimeReact Toast instance'i Providers icinden uygulamanin geri kalanina context olarak verilir.
export const ToastContext = createContext<ShowToastFn | null>(null);

// Provider disinda kullanilirsa hatayi erken vererek sessiz toast kaybini engeller.
export function useToast(): ShowToastFn {
  const fn = useContext(ToastContext);
  if (!fn) {
    throw new Error("useToast must be used inside <Providers>");
  }
  return fn;
}
