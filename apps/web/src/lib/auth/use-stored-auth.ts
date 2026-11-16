"use client";

import { useSyncExternalStore } from "react";
import {
  getStoredAuth,
  subscribeToAuthChanges,
  type StoredAuth,
} from "./auth-storage";

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

export function useStoredAuth() {
  return useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );
}
