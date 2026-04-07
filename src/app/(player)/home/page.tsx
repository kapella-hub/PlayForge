import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getDueForReview, getPlayerProgress } from "@/lib/actions/progress-actions";
import { getPlayerQuizzes } from "@/lib/actions/quiz-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileQuestion, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const [dueForReview, progress, quizzes, activeGamePlan] = await Promise.all([
    getDueForReview(session.user.id),
    getPlayerProgress(session.user.id),
    getPlayerQuizzes(membership.orgId),
    getActiveGamePlan(membership.orgId),
  ]);

  const firstName = session.user.name?.split(" ")[0] ?? "Player";
  const masteredCount = progress.filter((p) => p.masteryLevel === "mastered").length;
  const totalPlays = progress.length;
  const masteryPct = totalPlays > 0 ? Math.round((masteredCount / totalPlays) * 100) : 0;

  const hasContent = dueForReview.length > 0 || quizzes.length > 0 || totalPlays > 0;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-white">Hey, {firstName}</h1>
        <p className="text-sm text-zinc-500">
          {hasContent
            ? "Here\u2019s what\u2019s on your plate today."
            : "Your study feed is empty. Check back when your coach assigns plays."}
        </p>
      </div>

      {!hasContent ? (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="py-4">
            <div className="text-[11px] font-semibold text-amber-400">
              NO PLAYS ASSIGNED
            </div>
            <div className="mt-1 text-sm font-medium text-white">
              Ask your coach for an invite code to join a team.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Due for Review */}
          {dueForReview.length > 0 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="py-4">
                <div className="mb-2 text-[11px] font-semibold text-amber-400">
                  DUE FOR REVIEW
                </div>
                <div className="space-y-2">
                  {dueForReview.map((item) => (
                    <Link
                      key={item.id}
                      href={`/plays/${item.playId}`}
                      className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-medium text-white">
                          {item.play.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {item.play.formation}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Quizzes */}
          {quizzes.length > 0 && (
            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="py-4">
                <div className="mb-2 text-[11px] font-semibold text-indigo-400">
                  QUIZZES
                </div>
                <div className="space-y-2">
                  {quizzes.slice(0, 5).map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/quiz/${quiz.id}`}
                      className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileQuestion className="h-4 w-4 text-indigo-400" />
                        <span className="text-sm font-medium text-white">
                          {quiz.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">
                          {quiz._count.questions} Q
                        </span>
                        {quiz.dueDate && (
                          <Badge variant="outline" className="text-[10px]">
                            Due{" "}
                            {new Date(quiz.dueDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mastery Progress */}
          {totalPlays > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-white">
                      Mastery
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-400">
                    {masteredCount}/{totalPlays}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${masteryPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-600">
                  {masteryPct}% of plays mastered
                </p>
              </CardContent>
            </Card>
          )}

          {/* Active Game Plan */}
          {activeGamePlan && (
            <Card>
              <CardContent className="py-4">
                <div className="mb-1 text-[11px] font-semibold text-zinc-500">
                  ACTIVE GAME PLAN
                </div>
                <p className="text-sm font-medium text-white">
                  {activeGamePlan.name}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  {activeGamePlan.plays.length} play
                  {activeGamePlan.plays.length !== 1 ? "s" : ""}
                  {activeGamePlan.opponent
                    ? ` \u00b7 vs. ${activeGamePlan.opponent}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
