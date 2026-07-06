"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  text: string;
  correct: boolean;
}

interface MultipleChoiceProps {
  questionText: string;
  options: Option[];
  onAnswer: (correct: boolean, answer: string) => void;
  showResult: boolean;
}

const LABELS = ["A", "B", "C", "D"] as const;

export function MultipleChoice({
  questionText,
  options,
  onAnswer,
  showResult,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(index: number) {
    if (showResult) return;
    setSelected(index);
    const option = options[index];
    onAnswer(option.correct, option.text);
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-foreground">{questionText}</p>

      <div className="space-y-2">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = option.correct;

          let variant = "border-border bg-secondary hover:border-border";
          if (showResult && isSelected && isCorrect) {
            variant = "border-success bg-success/30";
          } else if (showResult && isSelected && !isCorrect) {
            variant = "border-destructive bg-destructive/30";
          } else if (showResult && isCorrect) {
            variant = "border-success/50 bg-success/20";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={showResult}
              onClick={() => handleSelect(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                variant,
                showResult && "cursor-default",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground/85">
                {LABELS[i]}
              </span>
              <span className="flex-1 text-sm text-foreground">
                {option.text}
              </span>
              {showResult && isSelected && isCorrect && (
                <Check className="h-4 w-4 text-success" />
              )}
              {showResult && isSelected && !isCorrect && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
