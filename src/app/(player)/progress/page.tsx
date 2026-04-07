import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlayerProgress } from "@/lib/actions/progress-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

const MASTERY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  mastered: { bg: "bg-green-900/30", text: "text-green-400", bar: "bg-green-500" },
  reviewing: { bg: "bg-indigo-900/30", text: "text-indigo-400", bar: "bg-indigo-500" },
  learning: { bg: "bg-amber-900/30", text: "text-amber-400", bar: "bg-amber-500" },
  new_play: { bg: "bg-red-900/30", text: "text-red-400", bar: "bg-red-500" },
};

const MASTERY_LABELS: Record<string, string> = {
  mastered: "Mastered",
  reviewing: "Reviewing",
  learning: "Learning",
  new_play: "New",
};

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const progress = await getPlayerProgress(session.user.id);

  const counts = {
    mastered: progress.filter((p) => p.masteryLevel === "mastered").length,
    reviewing: progress.filter((p) => p.masteryLevel === "reviewing").length,
    learning: progress.filter((p) => p.masteryLevel === "learning").length,
    new_play: progress.filter((p) => p.masteryLevel === "new_play").length,
  };

  const total = progress.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Progress</h1>
        <p className="text-sm text-zinc-500">
          Track your mastery across all plays.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <BarChart3 className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No progress yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Start viewing plays to track your mastery.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["mastered", "reviewing", "learning", "new_play"] as const).map(
              (level) => {
                const colors = MASTERY_COLORS[level];
                return (
                  <Card key={level}>
                    <CardContent className="p-4 text-center">
                      <div
                        className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${colors.bg}`}
                      >
                        <span className={`text-lg font-bold ${colors.text}`}>
                          {counts[level]}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {MASTERY_LABELS[level]}
                      </p>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>

          {/* Mastery Breakdown Bar */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Mastery Breakdown
              </h2>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {(["mastered", "reviewing", "learning", "new_play"] as const).map(
                  (level) => {
                    const pct = total > 0 ? (counts[level] / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={level}
                        className={`${MASTERY_COLORS[level].bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  },
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {(["mastered", "reviewing", "learning", "new_play"] as const).map(
                  (level) => (
                    <div key={level} className="flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${MASTERY_COLORS[level].bar}`}
                      />
                      <span className="text-[10px] text-zinc-500">
                        {MASTERY_LABELS[level]} ({counts[level]})
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* Play List */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              All Plays
            </h2>
            {progress.map((p) => {
              const colors = MASTERY_COLORS[p.masteryLevel];
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {p.play.name}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {p.play.playbook?.name} &middot; {p.views} view
                        {p.views !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${colors.text}`}
                    >
                      {MASTERY_LABELS[p.masteryLevel]}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
