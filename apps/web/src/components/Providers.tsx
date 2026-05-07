"use client";

import type { ReactNode } from "react";
import { useRef, useCallback } from "react";
import { PrimeReactProvider } from "primereact/api";
import { Toast } from "primereact/toast";
import type { ToastMessage } from "primereact/toast";
import { ToastContext } from "@/lib/toast/toast-context";

export default function Providers({ children }: { children: ReactNode }) {
  const toastRef = useRef<Toast>(null);

  const showToast = useCallback((message: ToastMessage) => {
    toastRef.current?.show(message);
  }, []);

  return (
    <PrimeReactProvider value={{ unstyled: true }}>
      <ToastContext.Provider value={showToast}>
        <Toast
          ref={toastRef}
          pt={{
            root: {
              className:
                "pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2",
            },
            message: {
              className:
                "pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg",
            },
            summary: {
              className: "text-sm font-semibold text-slate-900",
            },
            detail: {
              className: "mt-0.5 text-xs text-slate-500",
            },
            icon: {
              className: "text-base shrink-0 mt-0.5",
            },
            closeButton: {
              className:
                "pointer-events-auto ml-auto inline-flex items-center justify-center rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600",
            },
          }}
        />
        {children}
      </ToastContext.Provider>
    </PrimeReactProvider>
  );
}
