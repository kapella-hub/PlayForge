"use client";

import { useEffect, useState } from "react";

const DISMISS_PREFIX = "playforge-install-dismissed:";

export function installDismissedKey(userId: string): string {
  return `${DISMISS_PREFIX}${userId}`;
}

export function isInstallDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(installDismissedKey(userId)) === "true";
  } catch {
    return false;
  }
}

export function dismissInstall(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(installDismissedKey(userId), "true");
  } catch {
    // best-effort
  }
}

export function isIosSafariNonStandalone(
  ua: string,
  standalone: boolean | undefined,
): boolean {
  const isIos = /iphone|ipad|ipod/i.test(ua);
  return isIos && standalone === false;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptState {
  canInstall: boolean;
  showIosHint: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(userId: string): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  // Compute iOS hint on mount and when userId changes
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowIosHint(
      isIosSafariNonStandalone(nav.userAgent, nav.standalone) &&
        !isInstallDismissed(userId),
    );
  }, [userId]);

  // Subscribe to beforeinstallprompt event
  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setCanInstall(!isInstallDismissed(userId));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [userId]);

  async function promptInstall(): Promise<void> {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setCanInstall(false);
    if (outcome === "dismissed") dismissInstall(userId);
  }

  function dismiss(): void {
    dismissInstall(userId);
    setCanInstall(false);
    setShowIosHint(false);
  }

  return { canInstall, showIosHint, promptInstall, dismiss };
}
