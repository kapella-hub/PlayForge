import { db } from "@/lib/db";
import type { MemberRole } from "@prisma/client";

export async function getUserMembership(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { org: true },
    orderBy: { org: { createdAt: "desc" } },
  });
  return membership;
}

export function isCoachRole(role: MemberRole): boolean {
  return role === "owner" || role === "coach" || role === "coordinator";
}
