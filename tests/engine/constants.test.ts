import { describe, it, expect } from "vitest";
import { FORMATIONS, FIELD, GAME_FORMATS } from "@/engine/constants";

describe("FORMATIONS", () => {
  it("has at least 6 offensive formations", () => {
    const offensive = FORMATIONS.filter((f) => f.side === "offense");
    expect(offensive.length).toBeGreaterThanOrEqual(6);
  });

  it("has at least 4 defensive formations", () => {
    const defensive = FORMATIONS.filter((f) => f.side === "defense");
    expect(defensive.length).toBeGreaterThanOrEqual(4);
  });

  it("11v11 formations have exactly 11 players", () => {
    const fullSize = FORMATIONS.filter(
      (f) => !f.id.match(/^\d+v\d+-/),
    );
    for (const formation of fullSize) {
      expect(formation.players).toHaveLength(11);
    }
  });

  it("flag football formations have correct player counts", () => {
    const flagFormats = ["4v4", "5v5", "6v6", "7v7", "8v8", "9v9"] as const;
    for (const fmt of flagFormats) {
      const count = GAME_FORMATS[fmt].players;
      const fmts = FORMATIONS.filter((f) => f.id.startsWith(`${fmt}-`));
      for (const formation of fmts) {
        expect(formation.players).toHaveLength(count);
      }
    }
  });

  it("each player has id, label, x, y within field bounds", () => {
    for (const formation of FORMATIONS) {
      for (const player of formation.players) {
        expect(player.id).toBeTruthy();
        expect(player.label).toBeTruthy();
        expect(player.x).toBeGreaterThanOrEqual(0);
        expect(player.x).toBeLessThanOrEqual(FIELD.WIDTH);
        expect(player.y).toBeGreaterThanOrEqual(0);
        expect(player.y).toBeLessThanOrEqual(FIELD.HEIGHT);
      }
    }
  });
});

describe("FIELD", () => {
  it("has standard dimensions", () => {
    expect(FIELD.WIDTH).toBeGreaterThan(0);
    expect(FIELD.HEIGHT).toBeGreaterThan(0);
    expect(FIELD.YARD_LINE_SPACING).toBeGreaterThan(0);
  });
});
