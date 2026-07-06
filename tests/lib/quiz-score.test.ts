import { describe, it, expect } from "vitest";
import { countSupportedQuestions, computeScorePercent } from "@/lib/quiz-score";

describe("countSupportedQuestions", () => {
  it("counts only multiple_choice questions", () => {
    expect(
      countSupportedQuestions([
        { questionType: "multiple_choice" },
        { questionType: "multiple_choice" },
        { questionType: "diagram" },
      ]),
    ).toBe(2);
  });

  it("returns 0 when there are no questions", () => {
    expect(countSupportedQuestions([])).toBe(0);
  });
});

describe("computeScorePercent", () => {
  it("scores an all-correct multiple-choice run as 100%, ignoring skipped types", () => {
    // 2 correct out of 2 supported; a 3rd, unsupported question was skipped
    expect(computeScorePercent(2, 2)).toBe(100);
  });

  it("rounds to the nearest percent", () => {
    expect(computeScorePercent(2, 3)).toBe(67);
  });

  it("returns 0 when there are no supported questions", () => {
    expect(computeScorePercent(0, 0)).toBe(0);
  });

  it("scores every supported question correct as 100% (all-supported, none skipped)", () => {
    expect(computeScorePercent(4, 4)).toBe(100);
  });
});
