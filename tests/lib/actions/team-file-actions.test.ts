import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    teamFile: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/authz", () => ({
  requireMembership: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));

import {
  getTeamFiles,
  createTeamFile,
  updateTeamFile,
  deleteTeamFile,
} from "@/lib/actions/team-file-actions";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/authz";

const mockedMembership = vi.mocked(requireMembership);
const membership = { id: "m1", userId: "u1", orgId: "org1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockedMembership.mockResolvedValue(membership as never);
});

describe("getTeamFiles", () => {
  it("requires a coach and scopes the query to the caller's org", async () => {
    vi.mocked(db.teamFile.findMany).mockResolvedValue([] as never);
    await getTeamFiles();
    expect(mockedMembership).toHaveBeenCalledWith({ coach: true });
    expect(db.teamFile.findMany).toHaveBeenCalledWith({
      where: { orgId: "org1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("createTeamFile", () => {
  it("derives orgId and createdById from the membership, not the client", async () => {
    vi.mocked(db.teamFile.create).mockResolvedValue({ id: "tf1" } as never);
    await createTeamFile({ title: "Rules", url: "https://x", category: "rules" });
    expect(db.teamFile.create).toHaveBeenCalledWith({
      data: {
        orgId: "org1",
        title: "Rules",
        url: "https://x",
        category: "rules",
        createdById: "u1",
      },
    });
  });

  it("rejects non-http(s) urls and never touches the database", async () => {
    await expect(
      createTeamFile({
        title: "XSS",
        url: "javascript:alert(1)",
        category: "rules",
      }),
    ).rejects.toThrow("Only http(s) links are allowed");
    expect(db.teamFile.create).not.toHaveBeenCalled();
  });
});

describe("updateTeamFile", () => {
  it("scopes the update by org and throws when no row matches", async () => {
    vi.mocked(db.teamFile.updateMany).mockResolvedValue({ count: 0 } as never);
    await expect(
      updateTeamFile("tf1", { title: "T", url: "https://y" }),
    ).rejects.toThrow("Team file not found");
    expect(db.teamFile.updateMany).toHaveBeenCalledWith({
      where: { id: "tf1", orgId: "org1" },
      data: { title: "T", url: "https://y" },
    });
  });

  it("resolves when a row matches", async () => {
    vi.mocked(db.teamFile.updateMany).mockResolvedValue({ count: 1 } as never);
    await expect(
      updateTeamFile("tf1", { title: "T", url: "https://y" }),
    ).resolves.toBeUndefined();
  });

  it("rejects non-http(s) urls and never touches the database", async () => {
    await expect(
      updateTeamFile("tf1", { title: "T", url: "javascript:alert(1)" }),
    ).rejects.toThrow("Only http(s) links are allowed");
    expect(db.teamFile.updateMany).not.toHaveBeenCalled();
  });
});

describe("deleteTeamFile", () => {
  it("scopes the delete by org and throws when no row matches", async () => {
    vi.mocked(db.teamFile.deleteMany).mockResolvedValue({ count: 0 } as never);
    await expect(deleteTeamFile("tf1")).rejects.toThrow("Team file not found");
    expect(db.teamFile.deleteMany).toHaveBeenCalledWith({
      where: { id: "tf1", orgId: "org1" },
    });
  });

  it("resolves when a row matches", async () => {
    vi.mocked(db.teamFile.deleteMany).mockResolvedValue({ count: 1 } as never);
    await expect(deleteTeamFile("tf1")).resolves.toBeUndefined();
  });
});
