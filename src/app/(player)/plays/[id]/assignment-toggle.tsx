"use client";

import { useState } from "react";
import { PlayViewer } from "@/components/play/play-viewer";
import { Card, CardContent } from "@/components/ui/card";

interface PlayerAssignmentToggleProps {
  canvasData: unknown;
  matchedPlayerId: string | null;
  assignmentDescription: string | null;
  playerNotes: string | null;
}

export function PlayerAssignmentToggle({
  canvasData,
  matchedPlayerId,
  assignmentDescription,
  playerNotes,
}: PlayerAssignmentToggleProps) {
  const [showMyAssignment, setShowMyAssignment] = useState(false);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      {matchedPlayerId && (
        <div className="flex rounded-lg bg-zinc-800/80 p-0.5 w-fit">
          <button
            onClick={() => setShowMyAssignment(false)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              !showMyAssignment
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Full Play
          </button>
          <button
            onClick={() => setShowMyAssignment(true)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              showMyAssignment
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            My Assignment
          </button>
        </div>
      )}

      {/* Play viewer */}
      <PlayViewer
        canvasData={canvasData}
        highlightPlayerId={showMyAssignment && matchedPlayerId ? matchedPlayerId : undefined}
      />

      {/* Assignment details (only in My Assignment mode) */}
      {showMyAssignment && matchedPlayerId && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Your Assignment
            </h2>
            {assignmentDescription && (
              <p className="text-sm text-zinc-200">{assignmentDescription}</p>
            )}
            {playerNotes && (
              <p className="whitespace-pre-wrap text-sm text-zinc-400">
                {playerNotes}
              </p>
            )}
            {!assignmentDescription && !playerNotes && (
              <p className="text-sm text-zinc-500">
                No specific assignment details available for your position.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
