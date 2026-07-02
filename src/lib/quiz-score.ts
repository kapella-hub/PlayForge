export function countSupportedQuestions(
  questions: { questionType: string }[],
): number {
  return questions.filter((q) => q.questionType === "multiple_choice").length;
}

export function computeScorePercent(
  correctCount: number,
  supportedCount: number,
): number {
  if (supportedCount <= 0) return 0;
  return Math.round((correctCount / supportedCount) * 100);
}
