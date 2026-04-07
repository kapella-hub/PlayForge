import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getGamePlans } from "@/lib/actions/game-plan-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GamePlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const gamePlans = await getGamePlans(membership.orgId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Plans</h1>
          <p className="text-sm text-zinc-500">
            Weekly game plans and play selections.
          </p>
        </div>
      </div>

      {gamePlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <ClipboardList className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No game plans yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create a game plan to organize plays for upcoming games.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gamePlans.map((gp) => (
            <Card
              key={gp.id}
              className={`transition-colors hover:border-zinc-700 ${
                gp.isActive ? "border-indigo-500" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {gp.name}
                  </h3>
                  {gp.isActive && (
                    <Badge className="shrink-0 bg-indigo-600 text-[10px] text-white hover:bg-indigo-600">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-zinc-500">
                  <p>
                    {gp._count.plays}{" "}
                    {gp._count.plays === 1 ? "play" : "plays"}
                  </p>
                  {gp.opponent && <p>vs. {gp.opponent}</p>}
                  {gp.week != null && <p>Week {gp.week}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
