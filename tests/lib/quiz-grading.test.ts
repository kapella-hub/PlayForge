import { describe, it, expect } from "vitest";
import {
  gradeAnswers,
  matchMultipleChoice,
  isSupportedType,
} from "@/lib/quiz-grading";

const q = (
  id: string,
  correctText: string,
  type = "multiple_choice",
) => ({
  id,
  questionType: type,
  options: [
    { text: correctText, correct: true },
    { text: "wrong", correct: false },
  ],
});

describe("isSupportedType", () => {
  it("supports multiple_choice only", () => {
    expect(isSupportedType("multiple_choice")).toBe(true);
    expect(isSupportedType("tap_field")).toBe(false);
  });
});

describe("matchMultipleChoice", () => {
  it("marks the exact-text correct option as correct and reports correctText", () => {
    const opts = [
      { text: "Cover 2", correct: true },
      { text: "Cover 3", correct: false },
    ];
    expect(matchMultipleChoice(opts, "Cover 2")).toEqual({
      correct: true,
      correctText: "Cover 2",
    });
    expect(matchMultipleChoice(opts, "Cover 3")).toEqual({
      correct: false,
      correctText: "Cover 2",
    });
  });

  it("returns correctText null and correct false for null options", () => {
    expect(matchMultipleChoice(null, "x")).toEqual({
      correct: false,
      correctText: null,
    });
  });
});

describe("gradeAnswers", () => {
  it("grades a correct multiple-choice answer", () => {
    const res = gradeAnswers(
      [q("q1", "Cover 2")],
      [{ questionId: "q1", answer: "Cover 2" }],
    );
    expect(res.correctCount).toBe(1);
    expect(res.supportedCount).toBe(1);
    expect(res.score).toBe(1);
    expect(res.graded).toEqual([
      { questionId: "q1", answer: "Cover 2", correct: true },
    ]);
  });

  it("grades an incorrect answer as correct:false but still supported", () => {
    const res = gradeAnswers(
      [q("q1", "Cover 2")],
      [{ questionId: "q1", answer: "wrong" }],
    );
    expect(res.correctCount).toBe(0);
    expect(res.supportedCount).toBe(1);
    expect(res.score).toBe(0);
    expect(res.graded[0].correct).toBe(false);
  });

  it("excludes unsupported types from grading and the denominator", () => {
    const res = gradeAnswers(
      [
        q("q1", "Cover 2"),
        q("q2", "n/a", "tap_field"),
      ],
      [
        { questionId: "q1", answer: "Cover 2" },
        { questionId: "q2", answer: "Cover 2" },
      ],
    );
    // q2 is unsupported: not counted, but still present in graded as correct:false
    expect(res.supportedCount).toBe(1);
    expect(res.correctCount).toBe(1);
    expect(res.score).toBe(1);
    expect(res.graded).toEqual([
      { questionId: "q1", answer: "Cover 2", correct: true },
      { questionId: "q2", answer: "Cover 2", correct: false },
    ]);
  });

  it("returns a zeroed result for empty input", () => {
    expect(gradeAnswers([], [])).toEqual({
      graded: [],
      correctCount: 0,
      supportedCount: 0,
      score: 0,
    });
  });

  it("treats an unknown questionId as unsupported (not counted)", () => {
    const res = gradeAnswers(
      [q("q1", "Cover 2")],
      [{ questionId: "ghost", answer: "Cover 2" }],
    );
    expect(res.supportedCount).toBe(0);
    expect(res.score).toBe(0);
    expect(res.graded).toEqual([
      { questionId: "ghost", answer: "Cover 2", correct: false },
    ]);
  });
});
