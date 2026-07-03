"use client";

import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

// Reads the exact online/offline signal TanStack Query's mutation pause/resume
// logic uses, so the banner and the queueing behavior never drift apart.
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  );
}
