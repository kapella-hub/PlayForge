"use client";

interface PlayerData {
  id: string;
  name: string;
  position: string;
  progress: {
    playId: string;
    masteryLevel: "mastered" | "reviewing" | "learning" | "new_play";
    views: number;
  }[];
}

interface PlayData {
  id: string;
  name: string;
}

interface MasteryHeatmapProps {
  players: PlayerData[];
  plays: PlayData[];
}

const masteryColors: Record<string, string> = {
  mastered: "bg-success",
  reviewing: "bg-primary",
  learning: "bg-warning",
  new_play: "bg-destructive",
};

const masteryLabels: Record<string, string> = {
  mastered: "Mastered",
  reviewing: "Reviewing",
  learning: "Learning",
  new_play: "New",
};

export function MasteryHeatmap({ players, plays }: MasteryHeatmapProps) {
  if (players.length === 0 || plays.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        No mastery data available yet. Players need to start viewing plays.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground min-w-[160px]">
                Player
              </th>
              {plays.map((play) => (
                <th
                  key={play.id}
                  className="px-2 py-3 text-center text-xs font-medium text-muted-foreground min-w-[48px]"
                  title={play.name}
                >
                  <span className="block max-w-[60px] truncate">
                    {play.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const progressMap = new Map(
                player.progress.map((p) => [p.playId, p])
              );
              return (
                <tr key={player.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2">
                    <div className="text-sm font-medium text-foreground">
                      {player.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {player.position}
                    </div>
                  </td>
                  {plays.map((play) => {
                    const p = progressMap.get(play.id);
                    const level = p?.masteryLevel;
                    const colorClass =
                      level && p.views > 0
                        ? masteryColors[level]
                        : "bg-secondary";
                    return (
                      <td key={play.id} className="px-2 py-2 text-center">
                        <div
                          className={`mx-auto h-6 w-6 rounded ${colorClass}`}
                          title={
                            level && p.views > 0
                              ? `${masteryLabels[level]} (${p.views} views)`
                              : "Not viewed"
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(masteryColors).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded ${color}`} />
            <span>{masteryLabels[level]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-secondary" />
          <span>Not viewed</span>
        </div>
      </div>
    </div>
  );
}
