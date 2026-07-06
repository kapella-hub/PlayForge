import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getGamePlans } from "@/lib/actions/game-plan-actions";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { CreateGamePlanDialog } from "./create-game-plan-dialog";

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
          <h1 className="text-2xl font-bold text-foreground">Game Plans</h1>
          <p className="text-sm text-muted-foreground">
            Weekly game plans and play selections.
          </p>
        </div>
        <CreateGamePlanDialog orgId={membership.orgId} />
      </div>

      {gamePlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No game plans yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Create a game plan to organize plays for upcoming games.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gamePlans.map((gp) => (
            <Link key={gp.id} href={`/game-plans/${gp.id}`}>
            <Card
              className={`${
                gp.isActive ? "border-primary" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {gp.name}
                  </h3>
                  {gp.isActive && (
                    <Badge className="shrink-0 bg-primary text-[10px] text-primary-foreground hover:bg-primary">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    {gp._count.plays}{" "}
                    {gp._count.plays === 1 ? "play" : "plays"}
                  </p>
                  {gp.opponent && <p>vs. {gp.opponent}</p>}
                  {gp.week != null && <p>Week {gp.week}</p>}
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
