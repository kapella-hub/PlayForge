export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  totalViews: number;
  totalQuizzes: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  playsMastered: number;
  totalPlays: number;
  daysActive: number;
}

export const BADGES: Badge[] = [
  {
    id: "first-play",
    name: "First Down",
    description: "View your first play",
    icon: "\uD83C\uDFC8",
    condition: (s) => s.totalViews >= 1,
  },
  {
    id: "five-plays",
    name: "Drive Starter",
    description: "View 5 plays",
    icon: "\uD83D\uDE97",
    condition: (s) => s.totalViews >= 5,
  },
  {
    id: "ten-plays",
    name: "Film Room Regular",
    description: "View 10 plays",
    icon: "\uD83C\uDFAC",
    condition: (s) => s.totalViews >= 10,
  },
  {
    id: "first-quiz",
    name: "Quiz Rookie",
    description: "Complete your first quiz",
    icon: "\uD83D\uDCDD",
    condition: (s) => s.totalQuizzes >= 1,
  },
  {
    id: "perfect-quiz",
    name: "Perfect Score",
    description: "Score 100% on a quiz",
    icon: "\uD83D\uDCAF",
    condition: (s) => s.averageScore >= 1.0,
  },
  {
    id: "three-day-streak",
    name: "Consistent",
    description: "Study 3 days in a row",
    icon: "\uD83D\uDD25",
    condition: (s) => s.currentStreak >= 3,
  },
  {
    id: "seven-day-streak",
    name: "On Fire",
    description: "Study 7 days in a row",
    icon: "\uD83D\uDD25\uD83D\uDD25",
    condition: (s) => s.currentStreak >= 7,
  },
  {
    id: "five-mastered",
    name: "Playmaker",
    description: "Master 5 plays",
    icon: "\u2B50",
    condition: (s) => s.playsMastered >= 5,
  },
  {
    id: "all-mastered",
    name: "Playbook Scholar",
    description: "Master all assigned plays",
    icon: "\uD83C\uDFC6",
    condition: (s) => s.playsMastered >= s.totalPlays && s.totalPlays > 0,
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Active for 7 days",
    icon: "\uD83D\uDEE1\uFE0F",
    condition: (s) => s.daysActive >= 7,
  },
];

export function getEarnedBadges(stats: PlayerStats): Badge[] {
  return BADGES.filter((b) => b.condition(stats));
}

export function calculateXP(stats: PlayerStats): number {
  return (
    stats.totalViews * 10 +
    stats.totalQuizzes * 50 +
    stats.playsMastered * 100 +
    stats.currentStreak * 25
  );
}

export function getLevel(xp: number): {
  level: number;
  title: string;
  nextLevelXP: number;
} {
  const levels = [
    { xp: 0, title: "Rookie" },
    { xp: 100, title: "Starter" },
    { xp: 300, title: "Contributor" },
    { xp: 600, title: "Playmaker" },
    { xp: 1000, title: "Captain" },
    { xp: 1500, title: "All-Star" },
    { xp: 2500, title: "MVP" },
  ];

  let level = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) {
      level = i;
      break;
    }
  }

  const next = levels[level + 1]?.xp ?? levels[level].xp;
  return { level: level + 1, title: levels[level].title, nextLevelXP: next };
}
