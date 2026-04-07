import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getPlayerQuizzes } from "@/lib/actions/quiz-actions";
import { QuizCard } from "@/components/quiz/quiz-card";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerQuizPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const quizzes = await getPlayerQuizzes(membership.orgId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Quizzes</h1>
        <p className="text-sm text-zinc-500">
          Test your knowledge on plays and formations.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <FileQuestion className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No quizzes assigned yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Your coach will assign quizzes when ready.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              id={quiz.id}
              name={quiz.name}
              questionCount={quiz._count.questions}
              dueDate={quiz.dueDate}
              gamePlanName={quiz.gamePlan?.name}
              href={`/quiz/${quiz.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
