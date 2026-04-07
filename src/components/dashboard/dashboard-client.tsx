"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
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

export function TimeGreeting({ name }: { name?: string | null }) {
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        {greeting}{name ? `, ${name}` : ""}
      </h1>
      <p className="text-sm text-zinc-500">Team overview and quick actions.</p>
    </div>
  );
}
