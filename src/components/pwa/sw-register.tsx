"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export function SwRegister() {
  const toast = useToast();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });

    const onControllerChange = () => {
      if (!hadController) return; // first install claiming clients — not an update
      toast.info("PlayForge updated — reload for the latest version", {
        label: "Reload",
        onClick: () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        },
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, [toast]);

  return null;
}
