import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

import { changePassword } from "@/lib/actions/account-actions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(db.user.findUnique);
const mockUpdate = vi.mocked(db.user.update);
const mockCompare = vi.mocked(bcrypt.compare);
const mockHash = vi.mocked(bcrypt.hash);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("changePassword", () => {
  it("throws when there is no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(changePassword("old", "newpassword")).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCompare).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a new password shorter than 8 characters", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    await expect(changePassword("old", "short")).rejects.toThrow(/at least 8/);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCompare).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects when the account has no password", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockFindUnique.mockResolvedValue({ id: "u1", password: null } as never);
    await expect(changePassword("old", "newpassword")).rejects.toThrow(
      /no password/i,
    );
    expect(mockCompare).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects when the current password is wrong", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hash" } as never);
    mockCompare.mockResolvedValue(false as never);
    await expect(changePassword("wrong", "newpassword")).rejects.toThrow(
      /incorrect/i,
    );
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("hashes and stores the new password on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hash" } as never);
    mockCompare.mockResolvedValue(true as never);
    mockHash.mockResolvedValue("newhash" as never);
    await changePassword("old", "newpassword");
    expect(mockHash).toHaveBeenCalledWith("newpassword", 12);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "newhash" },
    });
    // Verify ordering: compare before hash before update
    expect(mockCompare.mock.invocationCallOrder[0]).toBeLessThan(
      mockHash.mock.invocationCallOrder[0],
    );
    expect(mockHash.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdate.mock.invocationCallOrder[0],
    );
  });
});
