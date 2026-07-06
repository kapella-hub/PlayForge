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

  it("distinguishes users with overlapping names (e.g., 'team' vs 'team-a')", () => {
    expect(isOwnDraftKey("playforge-draft:team-a-1700000000000", "team")).toBe(false);
    expect(isOwnDraftKey("playforge-draft:team-a-1700000000000", "team-a")).toBe(true);
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

  it("is best-effort: keys() failure does not propagate", () => {
    class FlakyKeysStorage extends MemoryStorage {
      override keys(): string[] {
        throw new Error("storage corrupted");
      }
    }
    const s = new FlakyKeysStorage({
      "playforge-draft-1": "legacy",
    });
    expect(() => adoptLegacyDraftKeys(s, "alice")).not.toThrow();
  });
});

describe("scoped draft round-trip", () => {
  it("save and scan via findLatestOwnDraftKey round-trip", () => {
    const s = new MemoryStorage();
    const ts = 1700000000;
    const key = scopedDraftKey("alice", ts);
    s.setItem(key, JSON.stringify({ content: "draft" }));
    expect(findLatestOwnDraftKey(s.keys(), "alice")).toBe(key);
    expect(s.getItem(key)).toBe(JSON.stringify({ content: "draft" }));
  });
});

describe("adoptLegacyDraftKeys idempotence", () => {
  it("is idempotent: second call changes nothing and draft remains discoverable", () => {
    const s = new MemoryStorage({
      "playforge-draft-777": JSON.stringify({ name: "Old" }),
    });
    adoptLegacyDraftKeys(s, "alice");
    const afterFirst = s.keys().sort();
    const adoptedKey = "playforge-draft:alice-777";
    expect(s.getItem(adoptedKey)).toBe(JSON.stringify({ name: "Old" }));
    expect(findLatestOwnDraftKey(afterFirst, "alice")).toBe(adoptedKey);

    adoptLegacyDraftKeys(s, "alice");
    const afterSecond = s.keys().sort();
    expect(afterSecond).toEqual(afterFirst);
    expect(s.getItem(adoptedKey)).toBe(JSON.stringify({ name: "Old" }));
    expect(findLatestOwnDraftKey(afterSecond, "alice")).toBe(adoptedKey);
  });
});
