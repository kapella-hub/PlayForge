"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/notifications";

const STORAGE_KEY = "playforge_notifications";

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function NotificationBell({
  incoming,
}: {
  incoming?: Notification[];
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  // Merge incoming notifications (deduplicate by type+title)
  useEffect(() => {
    if (!incoming || incoming.length === 0) return;
    setNotifications((prev) => {
      const existing = new Set(prev.map((n) => `${n.type}:${n.title}`));
      const newOnes = incoming.filter(
        (n) => !existing.has(`${n.type}:${n.title}`),
      );
      if (newOnes.length === 0) return prev;
      const merged = [...newOnes, ...prev].slice(0, 20);
      saveNotifications(merged);
      return merged;
    });
  }, [incoming]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) markAllRead();
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-zinc-800 bg-[#111122] shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <span className="text-sm font-semibold text-white">
              Notifications
            </span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Clear all
              </button>
            )}
          </div>

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
                  className={cn(
                    "block border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/40",
                    !n.read && "bg-indigo-950/20",
                  )}
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        n.type === "player_inactive"
                          ? "bg-amber-400"
                          : n.type === "quiz_due"
                            ? "bg-red-400"
                            : n.type === "game_plan"
                              ? "bg-indigo-400"
                              : "bg-emerald-400",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
