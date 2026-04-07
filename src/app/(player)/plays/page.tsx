import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { db } from "@/lib/db";
import { PlayerPlaysFilters } from "@/components/play/player-plays-filters";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerPlaysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const playbooks = await db.playbook.findMany({
    where: { orgId: membership.orgId },
    include: {
      plays: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const plays = playbooks.flatMap((pb) =>
    pb.plays.map((play) => ({
      id: play.id,
      name: play.name,
      formation: play.formation,
      playType: play.playType,
      playbookName: pb.name,
      side: pb.side,
    })),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Plays</h1>
        <p className="text-sm text-zinc-500">
          Browse all plays assigned to your team.
        </p>
      </div>

      {plays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <BookOpen className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No plays available yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Your coach hasn&apos;t added any plays to the playbook.
          </p>
        </div>
      ) : (
        <PlayerPlaysFilters plays={plays} />
      )}
    </div>
  );
}
