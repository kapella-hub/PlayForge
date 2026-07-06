import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlayerQuiz } from "@/lib/actions/quiz-actions";
import { AuthzError } from "@/lib/authz";
import { QuizFlow } from "@/components/quiz/quiz-flow";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  let quiz;
  try {
    quiz = await getPlayerQuiz(id);
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }
  if (!quiz) notFound();

  if (quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
        <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">This quiz has no questions yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Your coach is still building this quiz.
        </p>
      </div>
    );
  }

  return (
    <div>
      <QuizFlow quizId={quiz.id} quizName={quiz.name} questions={quiz.questions} />
    </div>
  );
}
