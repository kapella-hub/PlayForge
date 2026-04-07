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
          <h1 className="text-2xl font-bold text-white">Quizzes</h1>
          <p className="text-sm text-zinc-500">
            Manage quizzes for your players.
          </p>
        </div>
        <Link
          href="/quizzes/create"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Create Quiz
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <FileQuestion className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No quizzes yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create a quiz to test your players&apos; knowledge.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const due = quiz.dueDate ? new Date(quiz.dueDate) : null;
            return (
              <Card key={quiz.id} className="transition-colors hover:border-zinc-700">
                <CardContent className="p-5">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {quiz.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-500">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
