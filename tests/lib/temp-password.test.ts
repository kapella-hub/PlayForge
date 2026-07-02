import { describe, it, expect } from "vitest";
import { generateTempPassword } from "@/lib/temp-password";

describe("generateTempPassword", () => {
  it("returns a 10-character password by default", () => {
    expect(generateTempPassword()).toHaveLength(10);
  });

  it("respects a custom length", () => {
    expect(generateTempPassword(16)).toHaveLength(16);
  });

  it("only uses the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTempPassword()).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/,
      );
    }
  });

  it("produces different values on successive calls", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
