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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-[#111122]/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
                isActive ? "text-indigo-400" : "text-zinc-500"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-indigo-400")} />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
