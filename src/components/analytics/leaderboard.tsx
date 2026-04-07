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
  1: { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  2: { icon: Medal, color: "text-zinc-300", bg: "bg-zinc-300/10" },
  3: { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10" },
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
        <Filter className="h-4 w-4 text-zinc-500" />
        <div className="flex flex-wrap gap-1">
          {POSITION_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setFilter(group)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === group
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
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
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
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
                  className="py-8 text-center text-xs text-zinc-500"
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
                    className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${
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
                        <span className="pl-2 text-xs text-zinc-500">
                          {entry.rank}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-sm font-medium ${
                          entry.rank <= 3 ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        {entry.name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        {entry.positionGroup ?? "N/A"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          entry.rank === 1
                            ? "text-yellow-400"
                            : entry.rank === 2
                              ? "text-zinc-300"
                              : entry.rank === 3
                                ? "text-amber-600"
                                : "text-zinc-300"
                        }`}
                      >
                        {entry.compositeScore}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-xs text-zinc-400">
                      {entry.playsMastered}
                    </td>
                    <td className="py-2.5 text-right text-xs text-zinc-400">
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
