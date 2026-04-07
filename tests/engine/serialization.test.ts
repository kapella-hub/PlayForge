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
    expect(empty.meta.formation).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(deserializeCanvas(null).players).toEqual([]);
  });

  it("handles malformed JSON gracefully", () => {
    expect(deserializeCanvas("not-json").players).toEqual([]);
  });
});
