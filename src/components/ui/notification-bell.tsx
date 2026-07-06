"use client";

import { useState, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/notifications";

const STORAGE_KEY = "playforge_notifications";

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

const TYPE_COLOR: Record<string, string> = {
  player_inactive: "bg-warning",
  quiz_due: "bg-destructive",
  game_plan: "bg-primary",
};

export function NotificationBell({ incoming }: { incoming?: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  // Merge incoming: add new ids, refresh content on existing ids (keep read state
  // unless the message actually changed), keep history for ids no longer incoming.
  useEffect(() => {
    if (!incoming?.length) return;
    setNotifications((prev) => {
      const incomingById = new Map(incoming.map((n) => [n.id, n]));
      let changed = false;
      const refreshed = prev.map((n) => {
        const match = incomingById.get(n.id);
        if (!match) return n;
        const contentChanged =
          match.title !== n.title || match.message !== n.message;
        if (!contentChanged && match.timestamp === n.timestamp) return n;
        changed = true;
        return {
          ...n,
          title: match.title,
          message: match.message,
          timestamp: match.timestamp,
          read: contentChanged ? false : n.read,
        };
      });

      const existingIds = new Set(prev.map((n) => n.id));
      const fresh = incoming.filter((n) => !existingIds.has(n.id));
      if (!fresh.length && !changed) return prev;

      const merged = [...fresh, ...refreshed].slice(0, 20);
      saveNotifications(merged);
      return merged;
    });
  }, [incoming]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(updated);
      return updated;
    });
  }

  function markAllRead() {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }

  function clearAll() {
    setNotifications([]);
    saveNotifications([]);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && unreadCount > 0) markAllRead();
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          sideOffset={12}
          align="end"
          className={cn(
            "z-50 w-80 rounded-xl border border-border bg-card shadow-2xl backdrop-blur-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "duration-150",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.href ?? "#"}
                  onClick={() => { markRead(n.id); setOpen(false); }}
                  className={cn(
                    "block border-b border-border/50 px-4 py-3 transition-colors hover:bg-secondary",
                    !n.read && "bg-primary/10",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        !n.read ? (TYPE_COLOR[n.type] ?? "bg-primary") : "bg-muted",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-medium", n.read ? "text-muted-foreground" : "text-foreground")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>

          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
