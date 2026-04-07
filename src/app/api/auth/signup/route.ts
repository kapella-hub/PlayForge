import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { name, email, orgName } = await req.json();

  if (!name || !email || !orgName) {
    return NextResponse.json(
      { error: "Missing required fields" },
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

  const user = await db.user.create({
    data: { name, email },
  });

  const org = await db.organization.create({
    data: {
      name: orgName,
      slug: `${slug}-${user.id.slice(0, 6)}`,
      inviteCode: generateInviteCode(),
    },
  });

  await db.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "owner",
    },
  });

  return NextResponse.json({ userId: user.id, orgId: org.id }, { status: 201 });
}
