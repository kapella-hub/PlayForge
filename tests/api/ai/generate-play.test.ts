import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// @vitest-environment node

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/membership", () => ({
  getUserMembership: vi.fn(),
  isCoachRole: (role: string) => role === "coach",
}));
vi.mock("@/lib/authz", () => ({
  requireMembership: vi.fn(),
  AuthzError: class AuthzError extends Error {
    constructor(message = "Not authorized") {
      super(message);
      this.name = "AuthzError";
    }
  },
}));
vi.mock("@/lib/ai/play-generator", () => ({
  generatePlayFromDescription: vi.fn(),
}));

import { POST } from "@/app/api/ai/generate-play/route";
import { requireMembership, AuthzError } from "@/lib/authz";
import { generatePlayFromDescription } from "@/lib/ai/play-generator";

const mockRequireMembership = vi.mocked(requireMembership);
const mockGenerate = vi.mocked(generatePlayFromDescription);

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/ai/generate-play", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function coach(userId: string) {
  return { id: "m-" + userId, userId, orgId: "o1", role: "coach" } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerate.mockResolvedValue({ players: [], routes: [] } as never);
});

afterEach(() => {
  delete process.env.AI_GENERATE_RPM;
});

describe("POST /api/ai/generate-play", () => {
  it("returns 403 when the caller is not a coach", async () => {
    mockRequireMembership.mockRejectedValue(new AuthzError());
    const res = await post({ description: "slant right" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Only coaches can generate plays." });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 400 when the description is missing", async () => {
    mockRequireMembership.mockResolvedValue(coach("u-empty"));
    const res = await post({ description: "   " });
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 200 with canvasData for a coach", async () => {
    mockRequireMembership.mockResolvedValue(coach("u-ok"));
    mockGenerate.mockResolvedValue({ players: ["QB"], routes: [] } as never);
    const res = await post({ description: "slant right", side: "offense" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ canvasData: { players: ["QB"], routes: [] } });
    expect(mockGenerate).toHaveBeenCalledWith("slant right", {
      side: "offense",
      formation: undefined,
      gameFormat: undefined,
    });
  });

  it("returns 429 with Retry-After once the per-user limit is exceeded", async () => {
    process.env.AI_GENERATE_RPM = "2";
    mockRequireMembership.mockResolvedValue(coach("u-rate"));
    expect((await post({ description: "a" })).status).toBe(200);
    expect((await post({ description: "b" })).status).toBe(200);
    const res = await post({ description: "c" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect((await res.json()).error).toMatch(/too quickly/i);
  });
});
