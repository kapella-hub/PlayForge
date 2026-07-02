import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { PlayerTabs } from "@/components/layout/player-tabs";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-bell";
import { PageTransition } from "@/components/ui/page-transition";

export const dynamic = "force-dynamic";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getUserMembership(session.user.id);
  if (membership && isCoachRole(membership.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24 md:pb-8">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/8 bg-[var(--background)]/75 px-4 backdrop-blur-xl sm:px-6">
        <div>
          <span data-display="true" className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            PlayForge
          </span>
          <p className="hidden text-xs text-zinc-500 sm:block">Player install and review</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu user={session.user} />
        </div>
      </header>

      <main className="px-4 py-5 sm:px-6">
        <PageTransition>{children}</PageTransition>
      </main>

      <PlayerTabs />
    </div>
  );
}
