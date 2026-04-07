import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { CoachSidebar } from "@/components/layout/coach-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { PageTransition } from "@/components/ui/page-transition";

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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <CoachSidebar />

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end border-b border-zinc-800 bg-[var(--background)]/80 px-6 backdrop-blur-md">
          <UserMenu user={session.user} />
        </header>

        <main className="p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
