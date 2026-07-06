export interface GradingQuestion {
  id: string;
  questionType: string;
  options: { text: string; correct: boolean }[] | null;
}

export interface SubmittedAnswer {
  questionId: string;
  answer: string;
}

export interface GradedAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface GradeResult {
  graded: GradedAnswer[];
  correctCount: number;
  supportedCount: number;
  score: number;
}

const SUPPORTED_TYPES = new Set(["multiple_choice"]);

export function isSupportedType(questionType: string): boolean {
  return SUPPORTED_TYPES.has(questionType);
}

export function matchMultipleChoice(
  options: { text: string; correct: boolean }[] | null,
  answer: string,
): { correct: boolean; correctText: string | null } {
  const opts = options ?? [];
  const correct = opts.some((o) => o.correct && o.text === answer);
  const correctText = opts.find((o) => o.correct)?.text ?? null;
  return { correct, correctText };
}

export function gradeAnswers(
  questions: GradingQuestion[],
  submitted: SubmittedAnswer[],
): GradeResult {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const graded: GradedAnswer[] = [];
  let correctCount = 0;
  let supportedCount = 0;

  for (const { questionId, answer } of submitted) {
    const question = byId.get(questionId);
    if (!question || !isSupportedType(question.questionType)) {
      graded.push({ questionId, answer, correct: false });
      continue;
    }
    const { correct } = matchMultipleChoice(question.options, answer);
    supportedCount += 1;
    if (correct) correctCount += 1;
    graded.push({ questionId, answer, correct });
  }

  const score = supportedCount > 0 ? correctCount / supportedCount : 0;
  return { graded, correctCount, supportedCount, score };
}
