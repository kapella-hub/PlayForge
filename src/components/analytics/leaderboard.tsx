"use client";

import { useState, useEffect, useTransition } from "react";
import { Trophy, Medal, Award, Filter } from "lucide-react";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/actions/analytics-actions";

const POSITION_GROUPS = [
  "All",
  "QB",
  "WR",
  "RB",
  "OL",
  "DB",
  "LB",
  "DL",
] as const;

const RANK_STYLES: Record<number, { icon: typeof Trophy; color: string; bg: string }> = {
  1: { icon: Trophy, color: "text-accent", bg: "bg-accent/10" },
  2: { icon: Medal, color: "text-foreground/85", bg: "bg-foreground/10" },
  3: { icon: Award, color: "text-accent", bg: "bg-accent/10" },
};

interface LeaderboardProps {
  orgId: string;
  initialData: LeaderboardEntry[];
}

export function Leaderboard({ orgId, initialData }: LeaderboardProps) {
  const [filter, setFilter] = useState<string>("All");
  const [data, setData] = useState<LeaderboardEntry[]>(initialData);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const positionGroup = filter === "All" ? undefined : filter;
      const result = await getLeaderboard(orgId, positionGroup);
      setData(result);
    });
  }, [filter, orgId]);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          {POSITION_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setFilter(group)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === group
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-12 py-2 pr-2">#</th>
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4">Position</th>
              <th className="py-2 pr-4 text-right">Score</th>
              <th className="py-2 pr-4 text-right">Mastered</th>
              <th className="py-2 text-right">Quiz Avg</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  No players found for this position group.
                </td>
              </tr>
            ) : (
              data.map((entry) => {
                const rankStyle = RANK_STYLES[entry.rank];
                return (
                  <tr
                    key={entry.userId}
                    className={`border-b border-border/50 transition-colors hover:bg-secondary/30 ${
                      isPending ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-2">
                      {rankStyle ? (
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${rankStyle.bg}`}
                        >
                          <rankStyle.icon
                            className={`h-4 w-4 ${rankStyle.color}`}
                          />
                        </span>
                      ) : (
                        <span className="pl-2 text-xs text-muted-foreground">
                          {entry.rank}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-sm font-medium ${
                          entry.rank <= 3 ? "text-foreground" : "text-foreground/85"
                        }`}
                      >
                        {entry.name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {entry.positionGroup ?? "N/A"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          entry.rank === 1
                            ? "text-accent"
                            : entry.rank === 2
                              ? "text-foreground/85"
                              : entry.rank === 3
                                ? "text-accent"
                                : "text-foreground/85"
                        }`}
                      >
                        {entry.compositeScore}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-xs text-muted-foreground">
                      {entry.playsMastered}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">
                      {entry.quizAverage}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
