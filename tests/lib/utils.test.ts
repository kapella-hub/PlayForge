import { describe, it, expect } from "vitest";
import { generateInviteCode, cn } from "@/lib/utils";

describe("generateInviteCode", () => {
  it("returns a 6-character string", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("only contains uppercase letters and digits (no ambiguous chars)", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});
