"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { MemberRole } from "@prisma/client";

export async function getRoster(orgId: string) {
  const memberships = await db.membership.findMany({
    where: { orgId },
    include: {
      user: {
        include: {
          playerProgress: {
            select: { masteryLevel: true, lastViewedAt: true },
          },
        },
      },
    },
    orderBy: [{ role: "asc" }],
  });
  return memberships;
}

export async function removeMember(membershipId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Membership not found");

  // Verify the caller has authority in this org
  const callerMembership = await db.membership.findUnique({
    where: {
      userId_orgId: { userId: session.user.id, orgId: membership.orgId },
    },
  });
  if (
    !callerMembership ||
    !["owner", "coach"].includes(callerMembership.role)
  ) {
    throw new Error("Unauthorized");
  }

  await db.membership.delete({ where: { id: membershipId } });
  revalidatePath(`/team/${membership.orgId}/roster`);
}

export async function updateMemberPosition(
  membershipId: string,
  position: string
) {
  await db.membership.update({
    where: { id: membershipId },
    data: { position },
  });
}

export async function updateMemberRole(
  membershipId: string,
  role: MemberRole
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Membership not found");

  const callerMembership = await db.membership.findUnique({
    where: {
      userId_orgId: { userId: session.user.id, orgId: membership.orgId },
    },
  });
  if (!callerMembership || callerMembership.role !== "owner") {
    throw new Error("Only owners can change roles");
  }

  await db.membership.update({
    where: { id: membershipId },
    data: { role },
  });
  revalidatePath(`/team/${membership.orgId}/roster`);
}

export async function regenerateInviteCode(orgId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await db.membership.findUnique({
    where: {
      userId_orgId: { userId: session.user.id, orgId },
    },
  });
  if (
    !callerMembership ||
    !["owner", "coach"].includes(callerMembership.role)
  ) {
    throw new Error("Unauthorized");
  }

  const newCode = generateInviteCode();
  await db.organization.update({
    where: { id: orgId },
    data: { inviteCode: newCode },
  });

  revalidatePath(`/team/${orgId}/roster`);
  revalidatePath(`/team/${orgId}/settings`);

  return newCode;
}

export async function getOrganization(orgId: string) {
  return db.organization.findUnique({
    where: { id: orgId },
  });
}
