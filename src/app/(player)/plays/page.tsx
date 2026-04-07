import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      ...play,
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plays.map((play) => (
            <Link key={play.id} href={`/plays/${play.id}`}>
              <Card className="transition-colors hover:border-zinc-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {play.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {play.formation}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {play.playType.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-600">
                    {play.playbookName}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
