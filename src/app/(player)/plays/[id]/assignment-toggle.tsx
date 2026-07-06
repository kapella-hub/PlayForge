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
        <div className="flex rounded-lg bg-secondary p-0.5 w-fit">
          <button
            onClick={() => setShowMyAssignment(false)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              !showMyAssignment
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Full Play
          </button>
          <button
            onClick={() => setShowMyAssignment(true)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              showMyAssignment
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Assignment
            </h2>
            {assignmentDescription && (
              <p className="text-sm text-foreground">{assignmentDescription}</p>
            )}
            {playerNotes && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {playerNotes}
              </p>
            )}
            {!assignmentDescription && !playerNotes && (
              <p className="text-sm text-muted-foreground">
                No specific assignment details available for your position.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
