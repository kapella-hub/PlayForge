"use client";

import { motion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export function DashboardStagger({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {children}
    </motion.div>
  );
}

export function DashboardCard({ children }: { children: ReactNode }) {
  return <motion.div variants={fadeUp}>{children}</motion.div>;
}

export function DashboardFadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TimeGreeting({ name }: { name?: string | null }) {
  // SSR-safe client flag: server + hydration render "" (matching the server HTML),
  // then the client swaps in the real greeting — no setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const greeting = mounted ? timeGreeting() : "";

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
        {greeting}{greeting && name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Team overview, install momentum, and next actions.</p>
    </div>
  );
}
