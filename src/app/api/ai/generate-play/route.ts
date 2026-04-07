import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePlayFromDescription } from "@/lib/ai/play-generator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
    const message =
      error instanceof Error ? error.message : "Failed to generate play";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
