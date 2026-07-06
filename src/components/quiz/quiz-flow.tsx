"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MultipleChoice } from "./multiple-choice";
import { submitQuizAttempt } from "@/lib/actions/quiz-actions";

interface QuizQuestion {
  id: string;
  questionType: string;
  questionText: string;
  options: { text: string }[] | null;
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
}

interface Reward {
  xpEarned: number;
  newBadges: { id: string; name: string; description: string; icon: string }[];
  scorePercent: number;
  correctCount: number;
  supportedCount: number;
  streak: { current: number; extended: boolean };
}

export function QuizFlow({ quizId, quizName, questions }: QuizFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);

  const question = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress =
    totalQuestions > 0 ? ((currentIndex + (finished ? 1 : 0)) / totalQuestions) * 100 : 0;

  function handleAnswer(answer: string) {
    setAnswers((prev) => [...prev, { questionId: question.id, answer }]);
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

  if (finished && reward) {
    return <QuizCelebration reward={reward} />;
  }

  // Skip unsupported question types
  if (question && question.questionType !== "multiple_choice") {
    // Auto-advance past non-multiple-choice questions
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Question type &quot;{question.questionType}&quot; is not yet
          supported.
        </p>
        <Button onClick={handleNext} variant="outline">
          Skip <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const options = question?.options ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{quizName}</h2>
        <p className="text-xs text-muted-foreground">
          Question {currentIndex + 1} of {totalQuestions}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      {question && (
        <MultipleChoice
          key={question.id}
          questionId={question.id}
          questionText={question.questionText}
          options={options}
          onAnswer={handleAnswer}
        />
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

function ScoreCountUp({
  value,
  reduced,
  start,
}: {
  value: number;
  reduced: boolean;
  start: boolean;
}) {
  const count = useMotionValue(reduced ? value : 0);
  const text = useTransform(count, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    if (reduced) {
      count.set(value);
      return;
    }
    if (!start) return;
    const controls = animate(count, value, { duration: 1, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value, reduced, start]);

  return <motion.span>{text}</motion.span>;
}

function QuizCelebration({ reward }: { reward: Reward }) {
  const reduced = useReducedMotion() === true;
  const isPerfect = reward.scorePercent === 100;
  const [startCount, setStartCount] = useState(false);

  const container = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduced ? 0 : 0.15,
        staggerChildren: reduced ? 0 : 0.35,
      },
    },
  };
  const item = {
    hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.4 },
    },
  };
  const pop = {
    hidden: reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 },
    show: {
      opacity: 1,
      scale: 1,
      transition: reduced
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 380, damping: 16 },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-5 py-12 text-center"
    >
      <motion.div variants={pop}>
        <CheckCircle2
          className={cn("h-16 w-16", isPerfect ? "text-accent" : "text-success")}
        />
      </motion.div>

      <motion.h2
        variants={item}
        className={cn(
          "text-2xl font-bold",
          isPerfect ? "text-accent" : "text-foreground",
        )}
      >
        {isPerfect ? "Perfect!" : "Quiz Complete!"}
      </motion.h2>

      <motion.p
        variants={item}
        onAnimationComplete={() => setStartCount(true)}
        className={cn(
          "text-5xl font-bold",
          isPerfect ? "text-accent" : "text-foreground",
        )}
      >
        <ScoreCountUp value={reward.scorePercent} reduced={reduced} start={startCount} />
      </motion.p>

      <motion.p variants={item} className="text-sm text-muted-foreground">
        {reward.correctCount} of {reward.supportedCount} correct
      </motion.p>

      {reward.xpEarned > 0 && (
        <motion.div
          variants={item}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          +{reward.xpEarned} XP
        </motion.div>
      )}

      {reward.streak.extended && (
        <motion.div
          variants={item}
          className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent"
        >
          <span>{"\uD83D\uDD25"}</span>
          <span>{reward.streak.current} day streak!</span>
        </motion.div>
      )}

      {reward.newBadges.length > 0 && (
        <motion.p
          variants={item}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          New badge{reward.newBadges.length !== 1 ? "s" : ""}
        </motion.p>
      )}
      {reward.newBadges.map((badge) => (
        <motion.div
          key={badge.id}
          variants={item}
          className="flex w-full max-w-xs items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-2 text-left"
        >
          <span className="text-2xl">{badge.icon}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </motion.div>
      ))}

      <motion.div variants={item}>
        <Link href="/quiz">
          <Button variant="outline">Back to Quizzes</Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
