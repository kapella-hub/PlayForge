import { describe, it, expect, vi } from "vitest";
import { resolveJoinUser } from "@/lib/auth/join-logic";

describe("resolveJoinUser", () => {
  it("allows a brand-new email (no existing user)", async () => {
    const res = await resolveJoinUser(null, "pw", vi.fn());
    expect(res).toEqual({ ok: true, mode: "new" });
  });

  it("accepts an existing user when the password matches", async () => {
    const compare = vi.fn().mockResolvedValue(true);
    const res = await resolveJoinUser({ password: "hash" }, "pw", compare);
    expect(res).toEqual({ ok: true, mode: "existing" });
    expect(compare).toHaveBeenCalledWith("pw", "hash");
  });

  it("rejects an existing user with a wrong password (401)", async () => {
    const compare = vi.fn().mockResolvedValue(false);
    const res = await resolveJoinUser({ password: "hash" }, "wrong", compare);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(401);
      expect(res.error).toMatch(/already exists/i);
    }
  });

  it("rejects an OAuth-only account (no password) with 409 and never compares", async () => {
    const compare = vi.fn();
    const res = await resolveJoinUser({ password: null }, "pw", compare);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(409);
      expect(res.error).toMatch(/google/i);
    }
    expect(compare).not.toHaveBeenCalled();
  });
});
