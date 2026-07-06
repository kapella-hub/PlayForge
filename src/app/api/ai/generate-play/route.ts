import { NextResponse } from "next/server";
import { requireMembership, AuthzError } from "@/lib/authz";
import { generatePlayFromDescription } from "@/lib/ai/play-generator";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Requests/minute per user for AI play generation; env-tunable, default 10. */
function resolveRpm(): number {
  const parsed = Number(process.env.AI_GENERATE_RPM);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export async function POST(req: Request) {
  try {
    const membership = await requireMembership({ coach: true });

    const gate = checkRateLimit(membership.userId, resolveRpm());
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error:
            "You're generating plays too quickly. Please wait a moment and try again.",
        },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
      );
    }

    const body = await req.json();
    const { description, side, formation, gameFormat } = body as {
      description?: string;
      side?: string;
      formation?: string;
      gameFormat?: string;
    };

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    const canvasData = await generatePlayFromDescription(description, {
      side: side as "offense" | "defense" | undefined,
      formation,
      gameFormat,
    });

    return NextResponse.json({ canvasData });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: "Only coaches can generate plays." },
        { status: 403 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate play";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json(
      { error: "Play generation failed. Please try again." },
      { status },
    );
  }
}
