import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn(), findMany: vi.fn() },
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
import { requireOrgAccess, AuthzError } from "@/lib/authz";
import bcrypt from "bcryptjs";

const mockFindUnique = vi.mocked(db.membership.findUnique);
const mockFindMany = vi.mocked(db.membership.findMany);
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
  it("throws AuthzError when the membership does not exist", async () => {
    mockFindUnique.mockResolvedValue(null as never);
    await expect(resetMemberPassword("m1")).rejects.toBeInstanceOf(AuthzError);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/not found/i);
    expect(mockRequireOrgAccess).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
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
    expect(mockRequireOrgAccess).toHaveBeenCalledWith("org1");
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects a coordinator caller (only owner/coach may reset) and never touches the password", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockRequireOrgAccess.mockResolvedValue({
      id: "caller-m",
      orgId: "org1",
      userId: "coordinator-u",
      role: "coordinator",
    } as never);
    await expect(resetMemberPassword("m1")).rejects.toThrow();
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
    mockRequireOrgAccess.mockResolvedValue({
      id: "caller-m",
      orgId: "org1",
      userId: "coach-u",
      role: "coach",
    } as never);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/only player/i);
    expect(mockRequireOrgAccess).toHaveBeenCalledWith("org1");
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("refuses to reset any player who belongs to more than one team", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockRequireOrgAccess.mockResolvedValue({
      id: "caller-m",
      orgId: "org1",
      userId: "coach-u",
      role: "coach",
    } as never);
    // A plain PLAYER membership on another team is now enough to refuse.
    mockFindMany.mockResolvedValue([
      { id: "m2", orgId: "org2", userId: "u1", role: "player" },
    ] as never);
    await expect(resetMemberPassword("m1")).rejects.toBeInstanceOf(AuthzError);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/multiple teams/i);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "u1", NOT: { id: "m1" } },
    });
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
    mockRequireOrgAccess.mockResolvedValue({
      id: "caller-m",
      orgId: "org1",
      userId: "coach-u",
      role: "coach",
    } as never);
    mockFindMany.mockResolvedValue([] as never);
    mockHash.mockResolvedValue("hashed" as never);
    const { tempPassword } = await resetMemberPassword("m1");
    expect(tempPassword).toHaveLength(10);
    expect(mockRequireOrgAccess).toHaveBeenCalledWith("org1");
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
