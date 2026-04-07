export interface Notification {
  id: string;
  type: "game_plan" | "quiz_due" | "new_plays" | "player_inactive";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  href?: string;
}

export interface TeamAnalytics {
  gamePlanName: string | null;
  installCompletion: number;
  avgQuizScore: number;
  inactivePlayers: { id: string; name: string; lastActive: Date | null }[];
  totalPlays: number;
}

export interface PlayerProgress {
  playId: string;
  masteryLevel: string;
  nextReviewAt: Date;
  views: number;
}

export interface QuizInfo {
  id: string;
  name: string;
  dueDate: Date | null;
  attempted: boolean;
}

let notifCounter = 0;
function nextId(): string {
  notifCounter++;
  return `notif_${Date.now()}_${notifCounter}`;
}

export function generateCoachNotifications(
  analytics: TeamAnalytics,
): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  // Inactive players
  if (analytics.inactivePlayers.length > 0) {
    const count = analytics.inactivePlayers.length;
    notifications.push({
      id: nextId(),
      type: "player_inactive",
      title: `${count} inactive player${count !== 1 ? "s" : ""}`,
      message: `${analytics.inactivePlayers.map((p) => p.name).slice(0, 3).join(", ")}${count > 3 ? ` and ${count - 3} more` : ""} haven't studied in 3+ days.`,
      timestamp: now,
      read: false,
      href: "/analytics",
    });
  }

  // Low quiz scores
  if (analytics.avgQuizScore > 0 && analytics.avgQuizScore < 60) {
    notifications.push({
      id: nextId(),
      type: "quiz_due",
      title: "Low quiz scores",
      message: `Team average quiz score is ${analytics.avgQuizScore}%. Consider reviewing difficult plays.`,
      timestamp: now,
      read: false,
      href: "/quizzes",
    });
  }

  // Game plan install progress
  if (analytics.gamePlanName && analytics.installCompletion < 100) {
    notifications.push({
      id: nextId(),
      type: "game_plan",
      title: "Install in progress",
      message: `"${analytics.gamePlanName}" is ${analytics.installCompletion}% installed across the team.`,
      timestamp: now,
      read: false,
      href: "/analytics",
    });
  }

  return notifications;
}

export function generatePlayerNotifications(
  progress: PlayerProgress[],
  quizzes: QuizInfo[],
): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  // Plays due for review
  const dueForReview = progress.filter(
    (p) => new Date(p.nextReviewAt) <= now && p.views > 0,
  );
  if (dueForReview.length > 0) {
    notifications.push({
      id: nextId(),
      type: "new_plays",
      title: `${dueForReview.length} play${dueForReview.length !== 1 ? "s" : ""} due for review`,
      message: "Keep your mastery up by reviewing plays that are due.",
      timestamp: now,
      read: false,
      href: "/plays",
    });
  }

  // Unfinished quizzes
  const pendingQuizzes = quizzes.filter((q) => !q.attempted);
  if (pendingQuizzes.length > 0) {
    const upcoming = pendingQuizzes[0];
    notifications.push({
      id: nextId(),
      type: "quiz_due",
      title: "Quiz available",
      message: `"${upcoming.name}" is waiting for you${upcoming.dueDate ? ` — due ${new Date(upcoming.dueDate).toLocaleDateString()}` : ""}.`,
      timestamp: now,
      read: false,
      href: "/quiz",
    });
  }

  // New plays (unviewed)
  const newPlays = progress.filter((p) => p.views === 0);
  if (newPlays.length > 0) {
    notifications.push({
      id: nextId(),
      type: "new_plays",
      title: `${newPlays.length} new play${newPlays.length !== 1 ? "s" : ""} added`,
      message: "New plays have been added to your game plan. Start studying!",
      timestamp: now,
      read: false,
      href: "/plays",
    });
  }

  return notifications;
}
