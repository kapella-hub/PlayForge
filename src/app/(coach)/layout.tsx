import { CoachSidebar } from "@/components/layout/coach-sidebar";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <CoachSidebar />

      {/* Main content area */}
      <div className="lg:pl-[240px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end border-b border-zinc-800 bg-[var(--background)]/80 px-6 backdrop-blur-md">
          {/* UserMenu will be added when auth is wired up */}
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
