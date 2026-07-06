"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";

interface Play {
  id: string;
  name: string;
  formation: string;
  playType: string;
  playbookName: string;
  side: string;
}

interface PlayerPlaysFiltersProps {
  plays: Play[];
}

const PLAY_TYPES = [
  { value: "all", label: "All" },
  { value: "run", label: "Run" },
  { value: "pass", label: "Pass" },
  { value: "play_action", label: "PA" },
  { value: "screen", label: "Screen" },
] as const;

export function PlayerPlaysFilters({ plays }: PlayerPlaysFiltersProps) {
  const [search, setSearch] = useState("");
  const [playTypeFilter, setPlayTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = plays;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (playTypeFilter !== "all") {
      result = result.filter((p) => p.playType === playTypeFilter);
    }

    return result;
  }, [plays, search, playTypeFilter]);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plays..."
              className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-3 text-sm text-foreground placeholder-muted-foreground/70 outline-none transition-colors focus:border-primary/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex rounded-lg bg-secondary p-0.5">
            {PLAY_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setPlayTypeFilter(pt.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  playTypeFilter === pt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {plays.length > 0 && (
        <p className="mb-3 text-xs text-muted-foreground/70">
          {filtered.length} of {plays.length} play{plays.length !== 1 ? "s" : ""}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-sm text-muted-foreground">No plays match your filters</p>
          <button
            onClick={() => {
              setSearch("");
              setPlayTypeFilter("all");
            }}
            className="mt-2 text-xs text-primary-emphasis hover:text-primary"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((play) => (
            <Link key={play.id} href={`/plays/${play.id}`}>
              <Card className="transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {play.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {play.formation}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {play.playType.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground/70">
                    {play.playbookName}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
