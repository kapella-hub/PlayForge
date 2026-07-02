export function computeStreak(
  progress: { lastViewedAt: Date | null }[],
  now: Date = new Date(),
): { current: number; longest: number; daysActive: number } {
  const viewDates = progress
    .filter((p) => p.lastViewedAt)
    .map((p) => {
      const d = new Date(p.lastViewedAt!);
      return d.toISOString().slice(0, 10);
    });

  const uniqueDays = [...new Set(viewDates)].sort().reverse();
  const daysActive = uniqueDays.length;

  if (uniqueDays.length === 0) return { current: 0, longest: 0, daysActive: 0 };

  const parseDayKey = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d); // month is 0-indexed in Date constructor
  };

  let current = 1;
  let longest = 1;
  let streak = 1;

  const today = now;
  const todayKey = today.toISOString().slice(0, 10);
  const isActiveToday = uniqueDays[0] === todayKey;

  // Check if streak is current (active today or yesterday)
  if (!isActiveToday) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    if (uniqueDays[0] !== yKey) {
      current = 0;
    }
  }

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseDayKey(uniqueDays[i - 1]);
    const curr = parseDayKey(uniqueDays[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.abs(diff - 1) < 0.5) {
      streak++;
      if (i < 10 && current > 0) current = streak; // Only count recent for current
    } else {
      streak = 1;
    }
    longest = Math.max(longest, streak);
  }

  if (current === 0) current = 0;
  longest = Math.max(longest, current);

  return { current, longest, daysActive };
}
