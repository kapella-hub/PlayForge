import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getQuiz } from "@/lib/actions/quiz-actions";
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
  const quiz = await getQuiz(id);
  if (!quiz) notFound();

  if (quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
        <FileQuestion className="mb-4 h-12 w-12 text-zinc-700" />
        <p className="text-sm text-zinc-500">This quiz has no questions yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Your coach is still building this quiz.
        </p>
      </div>
    );
  }

  const questions = quiz.questions.map((q) => ({
    id: q.id,
    questionType: q.questionType,
    questionText: q.questionText,
    options: q.options as { text: string; correct: boolean }[] | null,
    correctAnswer: q.correctAnswer,
    play: q.play
      ? { name: q.play.name, formation: q.play.formation }
      : null,
  }));

  return (
    <div>
      <QuizFlow
        quizId={quiz.id}
        quizName={quiz.name}
        questions={questions}
      />
    </div>
  );
}
