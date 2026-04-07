interface ReviewState {
  easeFactor: number;
  intervalDays: number;
  repetition: number;
}

export function qualityFromScore(score: number): number {
  if (score >= 0.95) return 5;
  if (score >= 0.8) return 4;
  if (score >= 0.6) return 3;
  if (score >= 0.4) return 2;
  if (score >= 0.2) return 1;
  return 0;
}

export function calculateNextReview(state: ReviewState, quality: number): ReviewState {
  const diff = 5 - quality;
  let newEF = state.easeFactor + (0.1 - diff * (0.08 + diff * 0.02));
  newEF = Math.max(1.3, newEF);

  if (quality < 3) {
    return { easeFactor: newEF, intervalDays: 1, repetition: 0 };
  }

  let newInterval: number;
  if (state.repetition === 0) newInterval = 1;
  else if (state.repetition === 1) newInterval = 3;
  else newInterval = state.intervalDays * newEF;

  return { easeFactor: newEF, intervalDays: newInterval, repetition: state.repetition + 1 };
}

export function masteryFromInterval(intervalDays: number): string {
  if (intervalDays === 0) return "new_play";
  if (intervalDays < 3) return "learning";
  if (intervalDays <= 21) return "reviewing";
  return "mastered";
}
