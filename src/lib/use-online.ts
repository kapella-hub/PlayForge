"use client";

import { useSyncExternalStore } from "react";

export function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function getSnapshot(): boolean {
  return navigator.onLine;
}

export function getServerSnapshot(): boolean {
  // SSR renders as online; hydration corrects to actual navigator.onLine
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
