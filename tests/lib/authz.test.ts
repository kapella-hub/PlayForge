import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn() },
    playbook: { findUnique: vi.fn() },
    play: { findUnique: vi.fn() },
    gamePlan: { findUnique: vi.fn() },
    quiz: { findUnique: vi.fn() },
    practicePlan: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/membership", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/membership")>();
  return { ...actual, getUserMembership: vi.fn() };
});

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserMembership } from "@/lib/membership";
import {
  AuthzError,
  requireOrgAccess,
  requireMembership,
} from "@/lib/authz";

const mockAuth = vi.mocked(auth);
const mockGetUserMembership = vi.mocked(getUserMembership);
const mockMembershipFindUnique = vi.mocked(db.membership.findUnique);

const coachMembership = {
  id: "m1",
  userId: "u1",
  orgId: "o1",
  role: "coach",
  positionGroup: null,
  position: null,
};
const playerMembership = { ...coachMembership, id: "m2", role: "player" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireOrgAccess", () => {
  it("throws AuthzError when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(requireOrgAccess("o1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("throws AuthzError when the user is not a member of the org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(null as never);
    await expect(requireOrgAccess("o1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns the membership when the user is a member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(requireOrgAccess("o1")).resolves.toEqual(coachMembership);
    expect(mockMembershipFindUnique).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "u1", orgId: "o1" } },
    });
  });

  it("throws AuthzError for coach-only access when the role is player", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(playerMembership as never);
    await expect(
      requireOrgAccess("o1", { coach: true }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns the membership for coach-only access when the role is coach", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(
      requireOrgAccess("o1", { coach: true }),
    ).resolves.toEqual(coachMembership);
  });
});

describe("requireMembership", () => {
  it("throws AuthzError when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(requireMembership()).rejects.toBeInstanceOf(AuthzError);
  });

  it("throws AuthzError when the user has no membership", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(null as never);
    await expect(requireMembership()).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns the membership (with org) when present", async () => {
    const withOrg = { ...coachMembership, org: { id: "o1", name: "Org" } };
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(withOrg as never);
    await expect(requireMembership()).resolves.toEqual(withOrg);
  });

  it("throws AuthzError for coach-only when the role is player", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(playerMembership as never);
    await expect(
      requireMembership({ coach: true }),
    ).rejects.toBeInstanceOf(AuthzError);
  });
});
