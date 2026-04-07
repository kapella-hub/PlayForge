import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing invite code" },
      { status: 400 }
    );
  }

  const org = await db.organization.findUnique({
    where: { inviteCode: code.toUpperCase() },
    select: { name: true },
  });

  if (!org) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    );
  }

  return NextResponse.json({ orgName: org.name });
}
