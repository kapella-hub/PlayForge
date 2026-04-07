import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {},
        create: { name, email },
      });

      const existingMembership = await tx.membership.findUnique({
        where: { userId_orgId: { userId: user.id, orgId: org.id } },
      });

      if (existingMembership) {
        return { alreadyMember: true } as const;
      }

      await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "player",
          position,
        },
      });

      return { userId: user.id, orgId: org.id } as const;
    });

    if ("alreadyMember" in result) {
      return NextResponse.json(
        { error: "Already a member of this team" },
        { status: 409 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
