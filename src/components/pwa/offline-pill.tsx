"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/use-online";

export function OfflinePill() {
  const online = useOnline();
  if (online) return null;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
    >
      <WifiOff className="h-3 w-3" />
      Offline
    </span>
  );
}
