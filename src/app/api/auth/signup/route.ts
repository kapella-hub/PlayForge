import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { name, email, orgName } = await req.json();

    if (!name || !email || !orgName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email },
      });

      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug: `${slug}-${user.id.slice(0, 6)}`,
          inviteCode: generateInviteCode(),
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "owner",
        },
      });

      return { userId: user.id, orgId: org.id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
