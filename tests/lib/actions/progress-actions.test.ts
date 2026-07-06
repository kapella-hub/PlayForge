import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requirePlayAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {
    constructor(message = "Not authorized") {
      super(message);
      this.name = "AuthzError";
    }
  },
}));
vi.mock("@/lib/db", () => ({
  db: { playerProgress: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import { recordPlayView, recordQuizScore } from "@/lib/actions/progress-actions";
import { db } from "@/lib/db";
import { requirePlayAccess, AuthzError } from "@/lib/authz";

const mockRequire = vi.mocked(requirePlayAccess);
const membership = { id: "m1", userId: "u1", orgId: "o1", role: "player" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordPlayView", () => {
  it("authorizes the play (org via playbook) before writing and derives userId from membership", async () => {
    mockRequire.mockResolvedValue({ play: { id: "p1" }, membership } as never);
    vi.mocked(db.playerProgress.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.playerProgress.upsert).mockResolvedValue({ id: "pp1" } as never);

    await recordPlayView("p1");

    expect(mockRequire).toHaveBeenCalledWith("p1");
    expect(mockRequire.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.playerProgress.upsert).mock.invocationCallOrder[0],
    );
    const upsertArg = vi.mocked(db.playerProgress.upsert).mock.calls[0][0] as {
      where: { userId_playId: { userId: string; playId: string } };
    };
    expect(upsertArg.where.userId_playId).toEqual({ userId: "u1", playId: "p1" });
  });

  it("propagates AuthzError for a foreign/unknown play and never writes", async () => {
    mockRequire.mockRejectedValue(new AuthzError());
    await expect(recordPlayView("p1")).rejects.toBeInstanceOf(AuthzError);
    expect(db.playerProgress.upsert).not.toHaveBeenCalled();
  });
});

describe("recordQuizScore", () => {
  it("writes through the default db client when none is passed", async () => {
    mockRequire.mockResolvedValue({ play: { id: "p1" }, membership } as never);
    vi.mocked(db.playerProgress.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.playerProgress.upsert).mockResolvedValue({ id: "pp1" } as never);

    await recordQuizScore("p1", 0.8);

    expect(mockRequire).toHaveBeenCalledWith("p1");
    expect(db.playerProgress.upsert).toHaveBeenCalledTimes(1);
  });

  it("writes through a provided transaction client instead of db", async () => {
    mockRequire.mockResolvedValue({ play: { id: "p1" }, membership } as never);
    const tx = {
      playerProgress: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: "pp1" }),
      },
    };

    await recordQuizScore("p1", 0.8, tx as never);

    expect(tx.playerProgress.upsert).toHaveBeenCalledTimes(1);
    expect(db.playerProgress.upsert).not.toHaveBeenCalled();
  });
});
