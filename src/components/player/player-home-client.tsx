"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

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

export function PlayerStagger({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
}

export function PlayerCard({ children }: { children: ReactNode }) {
  return <motion.div variants={fadeUp}>{children}</motion.div>;
}

export function PlayerTimeGreeting({ firstName }: { firstName: string }) {
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return (
    <h1 className="text-xl font-bold text-white">
      {greeting}, {firstName}
    </h1>
  );
}

export function AnimatedProgressBar({ percentage }: { percentage: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <motion.div
        className="h-full rounded-full bg-green-500"
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
      />
    </div>
  );
}

export function PulseWrapper({
  children,
  pulse,
}: {
  children: ReactNode;
  pulse: boolean;
}) {
  if (!pulse) return <>{children}</>;
  return (
    <motion.div
      animate={{ boxShadow: ["0 0 0 0 rgba(245, 158, 11, 0)", "0 0 0 4px rgba(245, 158, 11, 0.1)", "0 0 0 0 rgba(245, 158, 11, 0)"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="rounded-xl"
    >
      {children}
    </motion.div>
  );
}
