import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getDueForReview, getPlayerProgress } from "@/lib/actions/progress-actions";
import { getPlayerQuizzes } from "@/lib/actions/quiz-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { computeStreak } from "@/lib/streak";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileQuestion, Trophy } from "lucide-react";
import { calculateXP, getLevel, type PlayerStats } from "@/lib/gamification";
import {
  PlayerStagger,
  PlayerCard,
  PlayerTimeGreeting,
  AnimatedProgressBar,
  PulseWrapper,
} from "@/components/player/player-home-client";

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

  // Gamification stats
  const totalViews = progress.reduce((sum, p) => sum + p.views, 0);
  const totalQuizzes = progress.reduce((sum, p) => sum + p.quizScores.length, 0);
  const allScores = progress.flatMap((p) => p.quizScores);
  const averageScore =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  const { current: currentStreak, longest: longestStreak, daysActive } =
    computeStreak(progress);
  const playerStats: PlayerStats = {
    totalViews,
    totalQuizzes,
    averageScore,
    hasPerfectQuiz: allScores.some((s) => s >= 1),
    currentStreak,
    longestStreak,
    playsMastered: masteredCount,
    totalPlays,
    daysActive,
  };
  const xp = calculateXP(playerStats);
  const levelInfo = getLevel(xp);
  const xpProgress = levelInfo.nextLevelXP > 0
    ? Math.min(100, Math.round((xp / levelInfo.nextLevelXP) * 100))
    : 100;

  const hasContent = dueForReview.length > 0 || quizzes.length > 0 || totalPlays > 0;

  // All items from getDueForReview are past their review date
  const hasOverdue = dueForReview.length > 0;

  return (
    <PlayerStagger>
      {/* Greeting */}
      <PlayerCard>
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <PlayerTimeGreeting firstName={firstName} />
            {totalPlays > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
                Lv.{levelInfo.level} {levelInfo.title}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {hasContent
              ? "Here\u2019s what\u2019s on your plate today."
              : "Your study feed is empty. Check back when your coach assigns plays."}
          </p>
          {totalPlays > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{xp} XP</span>
                <span>{levelInfo.nextLevelXP} XP</span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </PlayerCard>

      {!hasContent ? (
        <PlayerCard>
          <Card className="border-l-4 border-l-warning">
            <CardContent className="py-4">
              <div className="text-[11px] font-semibold text-warning">
                NO PLAYS ASSIGNED
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                Your coach hasn&apos;t assigned any plays yet. Check back soon.
              </div>
            </CardContent>
          </Card>
        </PlayerCard>
      ) : (
        <>
          {/* Due for Review */}
          {dueForReview.length > 0 && (
            <PlayerCard>
              <PulseWrapper pulse={hasOverdue}>
                <Card className="border-l-4 border-l-warning">
                  <CardContent className="py-4">
                    <div className="mb-2 text-[11px] font-semibold text-warning">
                      DUE FOR REVIEW
                    </div>
                    <div className="space-y-2">
                      {dueForReview.map((item) => (
                        <Link
                          key={item.id}
                          href={`/plays/${item.playId}`}
                          className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-secondary/50"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-warning" />
                            <span className="text-sm font-medium text-foreground">
                              {item.play.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {item.play.formation}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </PulseWrapper>
            </PlayerCard>
          )}

          {/* Pending Quizzes */}
          {quizzes.length > 0 && (
            <PlayerCard>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="py-4">
                  <div className="mb-2 text-[11px] font-semibold text-primary-emphasis">
                    QUIZZES
                  </div>
                  <div className="space-y-2">
                    {quizzes.slice(0, 5).map((quiz) => (
                      <Link
                        key={quiz.id}
                        href={`/quiz/${quiz.id}`}
                        className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex items-center gap-2">
                          <FileQuestion className="h-4 w-4 text-primary-emphasis" />
                          <span className="text-sm font-medium text-foreground">
                            {quiz.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
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
            </PlayerCard>
          )}

          {/* Mastery Progress */}
          {totalPlays > 0 && (
            <PlayerCard>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-foreground">
                        Mastery
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {masteredCount}/{totalPlays}
                    </span>
                  </div>
                  <AnimatedProgressBar percentage={masteryPct} />
                  <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                    {masteryPct}% of plays mastered
                  </p>
                </CardContent>
              </Card>
            </PlayerCard>
          )}

          {/* Active Game Plan */}
          {activeGamePlan && (
            <PlayerCard>
              <Card>
                <CardContent className="py-4">
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                    ACTIVE GAME PLAN
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {activeGamePlan.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {activeGamePlan.plays.length} play
                    {activeGamePlan.plays.length !== 1 ? "s" : ""}
                    {activeGamePlan.opponent
                      ? ` \u00b7 vs. ${activeGamePlan.opponent}`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </PlayerCard>
          )}
        </>
      )}
    </PlayerStagger>
  );
}
