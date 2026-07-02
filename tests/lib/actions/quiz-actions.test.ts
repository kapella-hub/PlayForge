import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    quiz: { update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/authz", () => ({
  requireQuizAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));
// Importing quiz-actions.ts pulls in @/lib/auth (NextAuth inits on import) via
// its top-level `auth` import and the transitive progress-actions import.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { updateQuiz, deleteQuiz } from "@/lib/actions/quiz-actions";
import { db } from "@/lib/db";
import { requireQuizAccess, AuthzError } from "@/lib/authz";

const mockedRequire = vi.mocked(requireQuizAccess);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateQuiz", () => {
  it("authorizes as coach, then updates the name", async () => {
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);
    vi.mocked(db.quiz.update).mockResolvedValue({ id: "q1", name: "New" } as never);

    await updateQuiz("q1", { name: "New" });

    expect(mockedRequire).toHaveBeenCalledWith("q1", { coach: true });
    expect(db.quiz.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { name: "New" },
    });
    // Verify authorization is checked before db mutation
    expect(mockedRequire.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.quiz.update).mock.invocationCallOrder[0]
    );
  });

  it("propagates AuthzError and never touches the db when access is denied", async () => {
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(updateQuiz("q1", { name: "New" })).rejects.toBeInstanceOf(AuthzError);
    expect(db.quiz.update).not.toHaveBeenCalled();
  });
});

describe("deleteQuiz", () => {
  it("authorizes as coach, then deletes", async () => {
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);
    vi.mocked(db.quiz.delete).mockResolvedValue({ id: "q1" } as never);

    await deleteQuiz("q1");

    expect(mockedRequire).toHaveBeenCalledWith("q1", { coach: true });
    expect(db.quiz.delete).toHaveBeenCalledWith({ where: { id: "q1" } });
    // Verify authorization is checked before db mutation
    expect(mockedRequire.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.quiz.delete).mock.invocationCallOrder[0]
    );
  });

  it("propagates AuthzError and never touches the db when access is denied", async () => {
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(deleteQuiz("q1")).rejects.toBeInstanceOf(AuthzError);
    expect(db.quiz.delete).not.toHaveBeenCalled();
  });
});
