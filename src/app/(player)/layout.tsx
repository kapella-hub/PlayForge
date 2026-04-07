import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { PlayerTabs } from "@/components/layout/player-tabs";
import { UserMenu } from "@/components/layout/user-menu";

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
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-800 bg-[var(--background)]/80 px-4 backdrop-blur-md">
        <span className="text-base font-bold text-indigo-400">PlayForge</span>
        <UserMenu user={session.user} />
      </header>

      <main className="px-4 py-4">{children}</main>

      <PlayerTabs />
    </div>
  );
}
