import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getQuizzes } from "@/lib/actions/quiz-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CoachQuizzesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const quizzes = await getQuizzes(membership.orgId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
          <p className="text-sm text-muted-foreground">
            Manage quizzes for your players.
          </p>
        </div>
        <Link
          href="/quizzes/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Quiz
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No quizzes yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Create a quiz to test your players&apos; knowledge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const due = quiz.dueDate ? new Date(quiz.dueDate) : null;
            return (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`}>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {quiz.name}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <p>
                        {quiz._count.questions}{" "}
                        {quiz._count.questions === 1 ? "question" : "questions"}
                      </p>
                      <p>
                        {quiz._count.attempts}{" "}
                        {quiz._count.attempts === 1 ? "attempt" : "attempts"}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {quiz.gamePlan && (
                        <Badge variant="outline" className="text-[10px]">
                          {quiz.gamePlan.name}
                        </Badge>
                      )}
                      {due && (
                        <Badge variant="outline" className="text-[10px]">
                          Due {due.toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
