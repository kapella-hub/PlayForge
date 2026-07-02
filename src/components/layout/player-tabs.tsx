"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, FileQuestion, BarChart3 } from "lucide-react";

const tabs = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Plays", href: "/plays", icon: BookOpen },
  { name: "Quiz", href: "/quiz", icon: FileQuestion },
  { name: "Progress", href: "/progress", icon: BarChart3 },
];

export function PlayerTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom md:bottom-4 md:flex md:justify-center md:px-4">
      <div className="flex items-center justify-around border-t border-white/8 bg-[linear-gradient(180deg,rgba(15,29,26,0.98),rgba(8,17,15,0.96))] backdrop-blur-xl md:w-full md:max-w-xl md:rounded-full md:border md:px-2 md:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors md:rounded-full",
                isActive ? "text-emerald-300 md:bg-white/[0.06]" : "text-zinc-500"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-emerald-300")} />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
