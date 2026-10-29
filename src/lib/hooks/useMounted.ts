"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// Stable cached snapshots for useSyncExternalStore
const STATIC_SERVER_DATE = new Date("2026-10-21T00:00:00Z");
let clientDateCache: Date | null = null;
let lastDateCheck = 0;

function getClientToday(): Date {
  const now = Date.now();
  if (!clientDateCache || now - lastDateCheck > 60000) {
    clientDateCache = new Date();
    lastDateCheck = now;
  }
  return clientDateCache;
}

export function useCurrentDate(): Date {
  return useSyncExternalStore(
    emptySubscribe,
    getClientToday,
    () => STATIC_SERVER_DATE
  );
}
