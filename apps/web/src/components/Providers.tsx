"use client";

import type { ReactNode } from "react";
import { useRef, useCallback } from "react";
import { PrimeReactProvider } from "primereact/api";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import type { ToastMessage } from "primereact/toast";
import {
  ConfirmContext,
  type ConfirmFn,
  type ConfirmOptions,
} from "@/lib/confirm/confirm-context";
import { MOTION_DURATIONS } from "@/lib/motion/motion-tokens";
import { ToastContext } from "@/lib/toast/toast-context";

const APP_CONFIRM_GROUP = "dashboard-confirm";
const CONFIRM_TRANSITION_TIMEOUT = {
  enter: Math.round(MOTION_DURATIONS.overlayEnter * 1000),
  exit: Math.round(MOTION_DURATIONS.overlayExit * 1000),
};
const TOAST_TRANSITION_TIMEOUT = {
  enter: Math.round(MOTION_DURATIONS.toastEnter * 1000),
  exit: Math.round(MOTION_DURATIONS.toastExit * 1000),
};

function resolveConfirmToneClasses(tone: ConfirmOptions["tone"]) {
  if (tone === "danger") {
    return {
      root: "app-confirm-danger",
      acceptButton:
        "app-pressable inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700",
      rejectButton:
        "app-pressable inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
    };
  }

  return {
    root: "app-confirm-default",
    acceptButton:
      "app-pressable inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700",
    rejectButton:
      "app-pressable inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
  };
}

export default function Providers({ children }: { children: ReactNode }) {
  const toastRef = useRef<Toast>(null);

  const showToast = useCallback((message: ToastMessage) => {
    toastRef.current?.show(message);
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      let isSettled = false;
      const settle = (value: boolean) => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        resolve(value);
      };
      const tone = options.tone ?? "default";
      const toneClasses = resolveConfirmToneClasses(tone);

      confirmDialog({
        group: APP_CONFIRM_GROUP,
        className: toneClasses.root,
        message: (
          <div className="space-y-3">
            <h2 className="text-lg font-black tracking-tight text-slate-950">
              {options.title ?? "Islemi onayla"}
            </h2>
            <div className="text-sm leading-6 text-slate-600">
              {options.message}
            </div>
          </div>
        ),
        acceptLabel:
          options.confirmLabel ?? (tone === "danger" ? "Onayla" : "Devam et"),
        rejectLabel: options.cancelLabel ?? "Vazgec",
        acceptClassName: toneClasses.acceptButton,
        rejectClassName: toneClasses.rejectButton,
        defaultFocus:
          options.defaultFocus ?? (tone === "danger" ? "reject" : "accept"),
        dismissableMask:
          options.dismissableMask ?? tone !== "danger",
        draggable: false,
        resizable: false,
        closable: false,
        closeOnEscape: true,
        blockScroll: false,
        icon: undefined,
        accept: () => settle(true),
        reject: () => settle(false),
        onHide: () => settle(false),
      });
    });
  }, []);

  return (
    <PrimeReactProvider value={{ unstyled: true }}>
      <ConfirmContext.Provider value={confirm}>
        <ToastContext.Provider value={showToast}>
          <ConfirmDialog
            group={APP_CONFIRM_GROUP}
            modal
            draggable={false}
            resizable={false}
            closable={false}
            closeOnEscape
            baseZIndex={1200}
            maskClassName="app-confirm-mask px-4"
            transitionOptions={{
              classNames: "app-confirm-transition",
              timeout: CONFIRM_TRANSITION_TIMEOUT,
            }}
            pt={{
              root: {
                className:
                  "w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.12)]",
              },
              content: {
                className: "px-6 pt-6",
              },
              icon: {
                className: "hidden",
              },
              message: {
                className: "flex-1",
              },
              footer: {
                className: "flex flex-wrap justify-end gap-2 px-6 pb-6 pt-4",
              },
            }}
          />
          <Toast
            ref={toastRef}
            position="bottom-right"
            transitionOptions={{
              classNames: "app-toast-transition",
              timeout: TOAST_TRANSITION_TIMEOUT,
            }}
            pt={{
              root: {
                className:
                  "pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2",
              },
              message: {
                className:
                  "app-toast-message pointer-events-auto flex items-start gap-3 rounded-[1rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.1)]",
              },
              summary: {
                className: "text-sm font-semibold text-slate-900",
              },
              detail: {
                className: "mt-0.5 text-xs leading-5 text-slate-500",
              },
              icon: {
                className: "mt-0.5 shrink-0 text-base text-blue-600",
              },
              closeButton: {
                className:
                  "pointer-events-auto ml-auto inline-flex items-center justify-center rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600",
              },
            }}
          />
          {children}
        </ToastContext.Provider>
      </ConfirmContext.Provider>
    </PrimeReactProvider>
  );
}
