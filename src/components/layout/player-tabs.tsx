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
      <div className="flex items-center justify-around border-t border-border surface-2 backdrop-blur-xl md:w-full md:max-w-xl md:rounded-full md:border md:px-2 md:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors md:rounded-full",
                isActive ? "text-primary-emphasis md:bg-secondary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary-emphasis")} />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
