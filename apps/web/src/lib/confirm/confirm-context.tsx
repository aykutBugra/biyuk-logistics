"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type ConfirmTone = "default" | "danger";
export type ConfirmDefaultFocus = "accept" | "reject";

export type ConfirmOptions = {
  title?: ReactNode;
  message: ReactNode;
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultFocus?: ConfirmDefaultFocus;
  dismissableMask?: boolean;
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// Confirm dialog tek bir provider tarafindan yonetilir, sayfalar sadece promise tabanli fonksiyon cagirir.
export const ConfirmContext = createContext<ConfirmFn | null>(null);

// Provider olmadan confirm cagrisi yapilirsa akis sessiz gecmesin diye hata firlatilir.
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);

  if (!fn) {
    throw new Error("useConfirm must be used inside <Providers>");
  }

  return fn;
}
