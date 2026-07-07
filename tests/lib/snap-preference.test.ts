import { describe, it, expect, beforeEach } from "vitest";
import {
  snapPreferenceKey,
  loadSnapPreference,
  saveSnapPreference,
} from "@/lib/snap-preference";

beforeEach(() => localStorage.clear());

describe("snap-preference", () => {
  it("builds a userId-scoped key", () => {
    expect(snapPreferenceKey("u1")).toBe("playforge-snap:u1");
  });

  it("defaults to ON when unset", () => {
    expect(loadSnapPreference("u1")).toBe(true);
  });

  it("round-trips a saved preference", () => {
    saveSnapPreference("u1", false);
    expect(loadSnapPreference("u1")).toBe(false);
    saveSnapPreference("u1", true);
    expect(loadSnapPreference("u1")).toBe(true);
  });

  it("scopes per user", () => {
    saveSnapPreference("u1", false);
    expect(loadSnapPreference("u2")).toBe(true);
  });

  it("treats a garbage stored value as OFF-only-when-exactly-false (default ON otherwise)", () => {
    localStorage.setItem(snapPreferenceKey("u1"), "garbage");
    expect(loadSnapPreference("u1")).toBe(true);
  });
});
