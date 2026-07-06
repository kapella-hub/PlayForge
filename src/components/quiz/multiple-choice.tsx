"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkAnswer } from "@/lib/actions/quiz-actions";

interface MultipleChoiceProps {
  questionId: string;
  questionText: string;
  options: { text: string }[];
  onAnswer: (correct: boolean, answer: string) => void;
}

const LABELS = ["A", "B", "C", "D"] as const;

export function MultipleChoice({
  questionId,
  questionText,
  options,
  onAnswer,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    correctText: string | null;
  } | null>(null);

  async function handleSelect(index: number) {
    if (checking || result !== null) return;
    setSelected(index);
    setChecking(true);
    try {
      const res = await checkAnswer(questionId, options[index].text);
      setResult(res);
      onAnswer(res.correct, options[index].text);
    } finally {
      setChecking(false);
    }
  }

  const locked = checking || result !== null;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-foreground">{questionText}</p>

      <div className="space-y-2">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrectOption = result?.correctText === option.text;

          let variant = "border-border bg-secondary hover:border-border";
          if (result && isSelected && result.correct) {
            variant = "border-success bg-success/30";
          } else if (result && isSelected && !result.correct) {
            variant = "border-destructive bg-destructive/30";
          } else if (result && isCorrectOption) {
            variant = "border-success/50 bg-success/20";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => handleSelect(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                variant,
                locked && "cursor-default",
                checking && isSelected && "opacity-70",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground/85">
                {LABELS[i]}
              </span>
              <span className="flex-1 text-sm text-foreground">
                {option.text}
              </span>
              {result && isSelected && result.correct && (
                <Check className="h-4 w-4 text-success" />
              )}
              {result && isSelected && !result.correct && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
