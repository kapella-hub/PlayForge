import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn() },
    user: { update: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requireOrgAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { resetMemberPassword } from "@/lib/actions/roster-actions";
import { db } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
import bcrypt from "bcryptjs";

const mockFindUnique = vi.mocked(db.membership.findUnique);
const mockUserUpdate = vi.mocked(db.user.update);
const mockRequireOrgAccess = vi.mocked(requireOrgAccess);
const mockHash = vi.mocked(bcrypt.hash);

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): the authz-rejection test below sets an
  // implementation via mockRejectedValue, which clearAllMocks would not undo
  // for later tests.
  vi.resetAllMocks();
});

describe("resetMemberPassword", () => {
  it("throws when the membership does not exist", async () => {
    mockFindUnique.mockResolvedValue(null as never);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/not found/i);
    expect(mockRequireOrgAccess).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("enforces coach access on the target org", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockHash.mockResolvedValue("hashed" as never);
    await resetMemberPassword("m1");
    expect(mockRequireOrgAccess).toHaveBeenCalledWith("org1", { coach: true });
  });

  it("propagates the authz error and does not touch the password when access is denied", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockRequireOrgAccess.mockRejectedValue(new Error("Not authorized"));
    await expect(resetMemberPassword("m1")).rejects.toThrow(/not authorized/i);
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("refuses to reset a non-player (coach/owner) password", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "coach",
    } as never);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/only player/i);
    expect(mockRequireOrgAccess).toHaveBeenCalledWith("org1", { coach: true });
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("stores the hashed temp password and returns the plaintext once", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockHash.mockResolvedValue("hashed" as never);
    const { tempPassword } = await resetMemberPassword("m1");
    expect(tempPassword).toHaveLength(10);
    expect(mockHash).toHaveBeenCalledWith(tempPassword, 12);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "hashed" },
    });
    // Verify ordering: authz check before hash before update
    expect(mockRequireOrgAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockHash.mock.invocationCallOrder[0],
    );
    expect(mockHash.mock.invocationCallOrder[0]).toBeLessThan(
      mockUserUpdate.mock.invocationCallOrder[0],
    );
  });
});
