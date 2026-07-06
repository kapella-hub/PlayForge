import { describe, it, expect } from "vitest";
import { slidingWindow, checkRateLimit } from "@/lib/rate-limit";

describe("slidingWindow", () => {
  it("allows the first request and records the timestamp", () => {
    const r = slidingWindow([], 1_000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.hits).toEqual([1_000]);
    expect(r.retryAfter).toBe(0);
  });

  it("allows requests up to the limit within the window", () => {
    const r = slidingWindow([1_000, 2_000], 3_000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.hits).toEqual([1_000, 2_000, 3_000]);
  });

  it("blocks when the limit is already reached inside the window", () => {
    const r = slidingWindow([1_000, 2_000, 3_000], 4_000, 3, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.hits).toEqual([1_000, 2_000, 3_000]); // unchanged: request not recorded
  });

  it("reports retryAfter as whole seconds until the oldest hit exits the window", () => {
    // oldest hit at 1_000, window 60_000 -> frees at 61_000; now 4_000 -> 57s
    const r = slidingWindow([1_000, 2_000, 3_000], 4_000, 3, 60_000);
    expect(r.retryAfter).toBe(57);
  });

  it("prunes hits older than the window before deciding", () => {
    // now 61_000, cutoff = 1_000; the 500 hit is dropped, leaving room
    const r = slidingWindow([500, 2_000, 3_000], 61_000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.hits).toEqual([2_000, 3_000, 61_000]);
  });

  it("never reports retryAfter below 1 second when blocked", () => {
    const r = slidingWindow([1_000, 2_000, 3_000], 60_999, 3, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBe(1);
  });
});

describe("checkRateLimit", () => {
  it("tracks state per key across calls", () => {
    const key = "user-A";
    expect(checkRateLimit(key, 2, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, 2_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, 3_000).allowed).toBe(false);
  });

  it("isolates buckets by key", () => {
    expect(checkRateLimit("user-B", 1, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit("user-C", 1, 60_000, 1_000).allowed).toBe(true);
  });

  it("recovers after the window slides past prior hits", () => {
    const key = "user-D";
    expect(checkRateLimit(key, 1, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000, 2_000).allowed).toBe(false);
    expect(checkRateLimit(key, 1, 60_000, 62_000).allowed).toBe(true); // 1_000 hit expired
  });
});
