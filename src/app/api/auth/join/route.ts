import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { name, email, position, inviteCode } = await req.json();

  if (!name || !email || !position || !inviteCode) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const org = await db.organization.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
  });

  if (!org) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    );
  }

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: { name, email },
    });
  }

  const existingMembership = await db.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "Already a member of this team" },
      { status: 409 }
    );
  }

  await db.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "player",
      position,
    },
  });

  return NextResponse.json({ userId: user.id, orgId: org.id }, { status: 201 });
}
