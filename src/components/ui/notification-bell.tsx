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
  player_inactive: "bg-amber-400",
  quiz_due: "bg-red-400",
  game_plan: "bg-indigo-400",
};

export function NotificationBell({ incoming }: { incoming?: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  // Merge incoming (deduplicate by id)
  useEffect(() => {
    if (!incoming?.length) return;
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const fresh = incoming.filter((n) => !existingIds.has(n.id));
      if (!fresh.length) return prev;
      const merged = [...fresh, ...prev].slice(0, 20);
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
    if (next && unreadCount > 0) markAllRead();
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
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
            "z-50 w-80 rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "duration-150",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-600">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.href ?? "#"}
                  onClick={() => { markRead(n.id); setOpen(false); }}
                  className={cn(
                    "block border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/40",
                    !n.read && "bg-indigo-950/20",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        !n.read ? (TYPE_COLOR[n.type] ?? "bg-emerald-400") : "bg-zinc-600",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-medium", n.read ? "text-zinc-400" : "text-white")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>

          <Popover.Arrow className="fill-zinc-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
