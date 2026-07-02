import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resolveJoinUser } from "@/lib/auth/join-logic";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, email, position, password, inviteCode } = await req.json();

    if (!name || !email || !position || !password || !inviteCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const org = await db.organization.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    const resolution = await resolveJoinUser(
      existingUser,
      password,
      (plain, hash) => bcrypt.compare(plain, hash),
    );
    if (!resolution.ok) {
      return NextResponse.json(
        { error: resolution.error },
        { status: resolution.status },
      );
    }

    const hashedPassword =
      resolution.mode === "new" ? await bcrypt.hash(password, 12) : null;

    const result = await db.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: { name, email, password: hashedPassword! },
        }));

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
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

