interface PlayProgress {
  playName: string;
  formation: string;
  viewedCount: number;
  quizPassedCount: number;
  totalPlayers: number;
}

interface InstallTrackerProps {
  gamePlanName: string;
  plays: PlayProgress[];
}

export function InstallTracker({ gamePlanName, plays }: InstallTrackerProps) {
  if (plays.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        No plays in the active game plan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">{gamePlanName}</h3>
      <div className="space-y-3">
        {plays.map((play) => {
          const viewedPct =
            play.totalPlayers > 0
              ? Math.round((play.viewedCount / play.totalPlayers) * 100)
              : 0;
          const quizPct =
            play.totalPlayers > 0
              ? Math.round((play.quizPassedCount / play.totalPlayers) * 100)
              : 0;

          return (
            <div
              key={play.playName}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-2">
                <span className="text-sm font-medium text-foreground">
                  {play.playName}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {play.formation}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Viewed</span>
                    <span>
                      {play.viewedCount}/{play.totalPlayers} ({viewedPct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${viewedPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Quiz Passed</span>
                    <span>
                      {play.quizPassedCount}/{play.totalPlayers} ({quizPct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-success transition-all"
                      style={{ width: `${quizPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
