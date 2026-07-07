import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { OfflineQuizGate } from "@/components/quiz/offline-quiz-gate";
import { MultipleChoice } from "@/components/quiz/multiple-choice";

// MultipleChoice imports checkAnswer from quiz-actions.ts, which imports
// @/lib/auth (NextAuth inits on import); mock it out as the existing
// tests/lib/actions/quiz-actions.test.ts does for the same reason.
vi.mock("@/lib/actions/quiz-actions", () => ({ checkAnswer: vi.fn() }));

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}
afterEach(() => setOnLine(true));

describe("OfflineQuizGate", () => {
  it("shows the offline banner while offline", () => {
    setOnLine(false);
    render(<OfflineQuizGate><Link href="/quiz/1">Quiz 1</Link></OfflineQuizGate>);
    expect(screen.getByText(/quizzes need a connection/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quiz 1" })).toBeInTheDocument();
  });

  it("hides the banner while online", () => {
    setOnLine(true);
    render(<OfflineQuizGate><Link href="/quiz/1">Quiz 1</Link></OfflineQuizGate>);
    expect(screen.queryByText(/quizzes need a connection/i)).not.toBeInTheDocument();
  });
});

describe("MultipleChoice disabled", () => {
  it("disables every option button when disabled", () => {
    render(
      <MultipleChoice
        questionId="q1"
        questionText="Pick one"
        options={[{ text: "A" }, { text: "B" }]}
        onAnswer={() => {}}
        disabled
      />,
    );
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toBeDisabled();
    }
  });
});
