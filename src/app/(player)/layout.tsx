import { PlayerTabs } from "@/components/layout/player-tabs";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-800 bg-[var(--background)]/80 px-4 backdrop-blur-md">
        <span className="text-base font-bold text-indigo-400">PlayForge</span>
        {/* UserMenu will be added when auth is wired up */}
      </header>

      <main className="px-4 py-4">{children}</main>

      <PlayerTabs />
    </div>
  );
}
