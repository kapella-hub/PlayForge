import { describe, it, expect } from "vitest";
import {
  scopedDraftKey,
  isOwnDraftKey,
  isLegacyDraftKey,
  findLatestOwnDraftKey,
  adoptLegacyDraftKeys,
  type DraftStorage,
} from "@/lib/draft-storage";

class MemoryStorage implements DraftStorage {
  m = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(init)) this.m.set(k, v);
  }
  keys() { return [...this.m.keys()]; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe("draft key helpers", () => {
  it("builds a scoped key", () => {
    expect(scopedDraftKey("alice", 123)).toBe("playforge-draft:alice-123");
  });

  it("recognizes only the current user's scoped keys", () => {
    expect(isOwnDraftKey("playforge-draft:alice-9", "alice")).toBe(true);
    expect(isOwnDraftKey("playforge-draft:bob-9", "alice")).toBe(false);
    expect(isOwnDraftKey("playforge-draft-9", "alice")).toBe(false);
  });

  it("recognizes only legacy keys", () => {
    expect(isLegacyDraftKey("playforge-draft-9")).toBe(true);
    expect(isLegacyDraftKey("playforge-draft:alice-9")).toBe(false);
  });

  it("finds the latest own draft, ignoring other users and legacy keys", () => {
    const keys = [
      "playforge-draft:alice-100",
      "playforge-draft:alice-300",
      "playforge-draft:bob-999",
      "playforge-draft-500",
      "unrelated",
    ];
    expect(findLatestOwnDraftKey(keys, "alice")).toBe("playforge-draft:alice-300");
    expect(findLatestOwnDraftKey(keys, "carol")).toBeNull();
  });
});

describe("adoptLegacyDraftKeys", () => {
  it("renames legacy keys into the user namespace, preserving timestamp and value", () => {
    const s = new MemoryStorage({
      "playforge-draft-777": JSON.stringify({ name: "Old" }),
      "playforge-draft:bob-1": "bobs",
      "playforge-draft:alice-2": "alices",
      "unrelated": "x",
    });
    adoptLegacyDraftKeys(s, "alice");
    expect(s.getItem("playforge-draft-777")).toBeNull();
    expect(s.getItem("playforge-draft:alice-777")).toBe(JSON.stringify({ name: "Old" }));
    expect(s.getItem("playforge-draft:bob-1")).toBe("bobs"); // other user untouched
    expect(s.getItem("playforge-draft:alice-2")).toBe("alices"); // existing own untouched
    expect(s.getItem("unrelated")).toBe("x");
  });

  it("is best-effort: a failure on one key does not abort the rest", () => {
    class FlakyStorage extends MemoryStorage {
      setItem(k: string, v: string) {
        if (v === "boom") throw new Error("quota");
        super.setItem(k, v);
      }
    }
    const s = new FlakyStorage({
      "playforge-draft-1": "boom",
      "playforge-draft-2": "ok",
    });
    expect(() => adoptLegacyDraftKeys(s, "alice")).not.toThrow();
    expect(s.getItem("playforge-draft:alice-2")).toBe("ok");
    expect(s.getItem("playforge-draft-2")).toBeNull();
  });
});
