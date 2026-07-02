"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultipleChoice } from "./multiple-choice";
import { submitQuizAttempt } from "@/lib/actions/quiz-actions";
import { countSupportedQuestions, computeScorePercent } from "@/lib/quiz-score";

interface QuizQuestion {
  id: string;
  questionType: string;
  questionText: string;
  options: { text: string; correct: boolean }[] | null;
  correctAnswer: string | null;
  play: { name: string; formation: string } | null;
}

interface QuizFlowProps {
  quizId: string;
  quizName: string;
  questions: QuizQuestion[];
}

interface Answer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export function QuizFlow({ quizId, quizName, questions }: QuizFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reward, setReward] = useState<{
    xpEarned: number;
    newBadges: { id: string; name: string; description: string; icon: string }[];
  } | null>(null);

  const question = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress =
    totalQuestions > 0 ? ((currentIndex + (finished ? 1 : 0)) / totalQuestions) * 100 : 0;

  function handleAnswer(correct: boolean, answer: string) {
    setAnswers((prev) => [
      ...prev,
      { questionId: question.id, answer, correct },
    ]);
    setShowResult(true);
  }

  async function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      setShowResult(false);
    } else {
      // Finish quiz
      setSubmitting(true);
      setSubmitError(null);
      try {
        const finalAnswers = answers;
        const result = await submitQuizAttempt({ quizId, answers: finalAnswers });
        setReward(result);
        setFinished(true);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to submit quiz. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    }
  }

  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const supportedCount = countSupportedQuestions(questions);
    const scorePercent = computeScorePercent(correctCount, supportedCount);

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
        <p className="text-4xl font-bold text-white">{scorePercent}%</p>
        <p className="text-sm text-zinc-400">
          {correctCount} of {supportedCount} correct
        </p>

        {reward && reward.xpEarned > 0 && (
          <p className="text-sm font-semibold text-indigo-400">
            +{reward.xpEarned} XP
          </p>
        )}

        {reward && reward.newBadges.length > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              New badge{reward.newBadges.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-col gap-2">
              {reward.newBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-left"
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{badge.name}</p>
                    <p className="text-xs text-zinc-500">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/quiz">
          <Button variant="outline">Back to Quizzes</Button>
        </Link>
      </div>
    );
  }

  // Skip unsupported question types
  if (question && question.questionType !== "multiple_choice") {
    // Auto-advance past non-multiple-choice questions
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-zinc-400">
          Question type &quot;{question.questionType}&quot; is not yet
          supported.
        </p>
        <Button onClick={handleNext} variant="outline">
          Skip <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const options = (question?.options ?? []) as {
    text: string;
    correct: boolean;
  }[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{quizName}</h2>
        <p className="text-xs text-zinc-500">
          Question {currentIndex + 1} of {totalQuestions}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      {question && (
        <MultipleChoice
          questionText={question.questionText}
          options={options}
          onAnswer={handleAnswer}
          showResult={showResult}
        />
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      {/* Next button */}
      {showResult && (
        <div className="flex justify-end">
          <Button onClick={handleNext} disabled={submitting}>
            {submitting ? (
              "Submitting..."
            ) : currentIndex < totalQuestions - 1 ? (
              <>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "Finish"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
