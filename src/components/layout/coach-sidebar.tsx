"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  PenTool,
  ClipboardList,
  Users,
  FileQuestion,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Notification } from "@/lib/notifications";

const navItems = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Playbooks", href: "/playbooks", icon: BookOpen },
      { name: "Game Plans", href: "/game-plans", icon: Target },
      { name: "Practice", href: "/practice", icon: ClipboardList },
      { name: "Play Designer", href: "/designer", icon: PenTool },
    ],
  },
  {
    label: "Team",
    items: [
      { name: "Roster", href: "/roster", icon: Users, badge: true },
      { name: "Quizzes", href: "/quizzes", icon: FileQuestion },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [{ name: "Organization", href: "/settings", icon: Settings }],
  },
];

function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-md bg-card px-2.5 py-1.5 text-xs font-medium text-card-foreground shadow-lg"
        >
          {label}
          <RadixTooltip.Arrow className="fill-card" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export function CoachSidebar({
  notifications,
}: {
  notifications?: Notification[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <RadixTooltip.Provider delayDuration={300}>
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground text-sm shadow-[0_10px_24px_rgba(15,118,110,0.25)]">
            PF
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-semibold text-foreground"
              data-display="true"
            >
              PlayForge
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden xl:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navItems.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const hasBadge = "badge" in item && item.badge;
                return (
                  <Tooltip key={item.href} label={item.name} show={collapsed}>
                    <Link
                      href={item.href}
                      aria-label={item.name}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(15,118,110,0.2)]"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <span className="relative flex-shrink-0">
                        <item.icon className="h-5 w-5" />
                        {hasBadge && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
                        )}
                      </span>
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Notifications & theme */}
      <div className="space-y-1 border-t border-border px-3 py-3">
        <Tooltip label="Notifications" show={collapsed}>
          <NotificationBell incoming={notifications} />
        </Tooltip>
        <Tooltip label="Toggle theme" show={collapsed}>
          <ThemeToggle />
        </Tooltip>
      </div>
    </div>
    </RadixTooltip.Provider>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        className="fixed left-4 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground shadow-lg backdrop-blur xl:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 xl:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[290px] border-r border-border surface-2 xl:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden xl:flex xl:fixed xl:inset-y-0 xl:left-0 xl:z-30 xl:flex-col border-r border-border surface-2 transition-[width] duration-300 ease-in-out",
          collapsed ? "xl:w-[78px]" : "xl:w-[240px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
