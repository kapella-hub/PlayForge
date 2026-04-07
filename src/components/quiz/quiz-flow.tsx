"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultipleChoice } from "./multiple-choice";
import { submitQuizAttempt } from "@/lib/actions/quiz-actions";

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
      const finalAnswers = answers;
      await submitQuizAttempt({ quizId, answers: finalAnswers });
      setFinished(true);
    }
  }

  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const scorePercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
        <p className="text-4xl font-bold text-white">{scorePercent}%</p>
        <p className="text-sm text-zinc-400">
          {correctCount} of {totalQuestions} correct
        </p>
        <Link href="/quizzes">
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

      {/* Next button */}
      {showResult && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {currentIndex < totalQuestions - 1 ? (
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
