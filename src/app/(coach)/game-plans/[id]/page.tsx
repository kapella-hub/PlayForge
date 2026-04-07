import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getGamePlan } from "@/lib/actions/game-plan-actions";
import { getPlaysByOrg } from "@/lib/actions/play-actions";
import { Badge } from "@/components/ui/badge";
import { GamePlanPlayList } from "@/components/game-plan/play-list";

export const dynamic = "force-dynamic";

export default async function GamePlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const { id } = await params;
  const gamePlan = await getGamePlan(id);
  if (!gamePlan) notFound();

  // Get all plays from the org's playbooks for the add-play picker
  const orgPlays = await getPlaysByOrg(membership.orgId);

  // Map plays already in the game plan
  const gamePlanPlays = gamePlan.plays.map((gpp) => ({
    id: gpp.id,
    playId: gpp.playId,
    sortOrder: gpp.sortOrder,
    name: gpp.play.name,
    formation: gpp.play.formation,
    playType: gpp.play.playType,
    thumbnailUrl: gpp.play.thumbnailUrl,
  }));

  // Available plays (not already in game plan)
  const existingPlayIds = new Set(gamePlanPlays.map((p) => p.playId));
  const availablePlays = orgPlays
    .filter((p) => !existingPlayIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      formation: p.formation,
      playType: p.playType,
    }));

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{gamePlan.name}</h1>
          {gamePlan.isActive && (
            <Badge className="bg-indigo-600 text-[10px] text-white hover:bg-indigo-600">
              Active
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
          {gamePlan.opponent && <span>vs. {gamePlan.opponent}</span>}
          {gamePlan.week != null && <span>Week {gamePlan.week}</span>}
          <span>
            {gamePlanPlays.length}{" "}
            {gamePlanPlays.length === 1 ? "play" : "plays"}
          </span>
        </div>
      </div>

      <GamePlanPlayList
        gamePlanId={id}
        plays={gamePlanPlays}
        availablePlays={availablePlays}
      />
    </div>
  );
}
