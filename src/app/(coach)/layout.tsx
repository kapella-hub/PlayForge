import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { CoachSidebar } from "@/components/layout/coach-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PageTransition } from "@/components/ui/page-transition";
import { getTeamAnalytics } from "@/lib/actions/analytics-actions";
import { generateCoachNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getUserMembership(session.user.id);
  if (!membership || !isCoachRole(membership.role)) {
    redirect("/home");
  }

  const analytics = await getTeamAnalytics(membership.orgId);
  const notifications = generateCoachNotifications(analytics);

  return (
    <div className="min-h-screen bg-background">
      <CoachSidebar notifications={notifications} />

      <div className="xl:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/75 px-4 pl-16 backdrop-blur-xl sm:px-6 sm:pl-20 xl:justify-end xl:pl-6">
          <div className="xl:hidden">
            <span data-display="true" className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-emphasis/80">
              PlayForge
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={session.user} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
