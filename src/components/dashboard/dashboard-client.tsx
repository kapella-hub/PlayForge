"use client";

import { motion } from "framer-motion";
import { useState, useEffect, type ReactNode } from "react";

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

export function TimeGreeting({ name }: { name?: string | null }) {
  // Empty initial state so server and client render the same empty string.
  // useEffect runs only on the client after hydration and sets the real greeting.
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
        {greeting}{greeting && name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Team overview, install momentum, and next actions.</p>
    </div>
  );
}
