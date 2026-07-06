import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuiz } from "@/lib/actions/quiz-actions";
import { requireQuizAccess, AuthzError } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { QuizDetailClient } from "./quiz-detail-client";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quiz: Awaited<ReturnType<typeof getQuiz>>;
  try {
    await requireQuizAccess(id, { coach: true });
    quiz = await getQuiz(id);
  } catch (err) {
    if (err instanceof AuthzError) notFound();
    throw err;
  }
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/quizzes"
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground/85"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <QuizDetailClient quizId={quiz.id} initialName={quiz.name} />
      </div>

      {quiz.questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <p className="text-sm text-muted-foreground">No questions yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            This quiz has no questions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quiz.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {q.questionText}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {q.questionType.replace(/_/g, " ")}
                      </Badge>
                      {q.play && <span>{q.play.name}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
