import { describe, it, expect } from "vitest";
import { serializeCanvas, deserializeCanvas, createEmptyCanvasData } from "@/engine/serialization";
import type { CanvasData } from "@/engine/types";

describe("serialization", () => {
  it("round-trips canvas data to JSON and back", () => {
    const data: CanvasData = {
      players: [
        { id: "QB", label: "QB", x: 500, y: 400, side: "offense" },
        { id: "WR1", label: "X", x: 180, y: 350, side: "offense" },
      ],
      routes: [
        {
          playerId: "WR1",
          waypoints: [{ x: 180, y: 350 }, { x: 180, y: 300 }, { x: 250, y: 250 }],
          type: "solid",
          routeType: "post",
        },
      ],
      motions: [],
      meta: { formation: "shotgun-2x2", playType: "pass", side: "offense" },
    };
    const json = serializeCanvas(data);
    const parsed = deserializeCanvas(json);
    expect(parsed).toEqual(data);
  });

  it("creates valid empty canvas data", () => {
    const empty = createEmptyCanvasData();
    expect(empty.players).toEqual([]);
    expect(empty.routes).toEqual([]);
    expect(empty.motions).toEqual([]);
    expect(empty.meta.formation).toBe("");
  });

  it("adds motions array for backward compat when missing", () => {
    const legacy = JSON.stringify({
      players: [{ id: "QB", label: "QB", x: 500, y: 400, side: "offense" }],
      routes: [],
      meta: { formation: "shotgun-2x2", playType: "pass", side: "offense" },
    });
    const parsed = deserializeCanvas(legacy);
    expect(parsed.motions).toEqual([]);
  });

  it("handles null/undefined gracefully", () => {
    expect(deserializeCanvas(null).players).toEqual([]);
  });

  it("handles malformed JSON gracefully", () => {
    expect(deserializeCanvas("not-json").players).toEqual([]);
  });
});

// ── applyVersionRestore ────────────────────────────────────────────

import { applyVersionRestore } from "@/engine/serialization";

describe("applyVersionRestore", () => {
  const current: CanvasData = {
    players: [{ id: "QB", label: "QB", x: 111, y: 222, side: "offense" }],
    routes: [],
    motions: [],
    meta: { formation: "trips", playType: "pass", side: "offense" },
  };

  it("snapshots the CURRENT canvas for undo, not the incoming version", () => {
    const incoming = JSON.stringify({
      players: [{ id: "QB", label: "QB", x: 500, y: 400, side: "offense" }],
      routes: [],
      motions: [],
      meta: { formation: "shotgun-2x2", playType: "pass", side: "offense" },
    });

    const { historyEntry, nextCanvas } = applyVersionRestore(current, incoming);

    // Undo-after-restore must return to the pre-restore work.
    expect(historyEntry).toBe(current);
    expect(nextCanvas.players[0].x).toBe(500);
    expect(nextCanvas).not.toBe(current);
  });

  it("heals legacy lowercase routeTypes in the restored canvas", () => {
    const incoming = JSON.stringify({
      players: [{ id: "X", label: "X", x: 300, y: 300, side: "offense" }],
      routes: [{ playerId: "X", waypoints: [{ x: 0, y: 0 }], routeType: "slant" }],
      motions: [],
      meta: { formation: "trips", playType: "pass", side: "offense" },
    });

    const { nextCanvas } = applyVersionRestore(current, incoming);
    expect(nextCanvas.routes[0].routeType).toBe("Slant");
  });
});
