"use client";

import * as Radix from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

// ── Root wrapper — same API as the old hand-rolled version ──────────────────
export function DropdownMenu({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Radix.Root>
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          sideOffset={4}
          align="end"
          className={cn(
            "z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl backdrop-blur-xl",
            // CSS entry/exit animations via Radix data-state
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "duration-100",
          )}
        >
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

// ── Menu item ───────────────────────────────────────────────────────────────
export function DropdownItem({
  children,
  onClick,
  variant = "default",
  asChild,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  asChild?: boolean;
}) {
  return (
    <Radix.Item
      asChild={asChild}
      onSelect={onClick}
      className={cn(
        "flex w-full cursor-default select-none items-center gap-2 px-3 py-1.5 text-sm outline-none transition-colors",
        variant === "destructive"
          ? "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          : "text-secondary-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-foreground",
      )}
    >
      {asChild ? children : <span className="flex items-center gap-2">{children}</span>}
    </Radix.Item>
  );
}

// ── Separator ───────────────────────────────────────────────────────────────
export function DropdownSeparator() {
  return <Radix.Separator className="my-1 h-px bg-border" />;
}

// ── Label ───────────────────────────────────────────────────────────────────
export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <Radix.Label className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </Radix.Label>
  );
}
