"use server";

import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { MemberRole } from "@prisma/client";
import { requireOrgAccess, AuthzError } from "@/lib/authz";

export async function getRoster(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
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
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError();

  const caller = await requireOrgAccess(membership.orgId);
  if (!["owner", "coach"].includes(caller.role)) throw new AuthzError();

  await db.membership.delete({ where: { id: membershipId } });
  revalidatePath(`/team/${membership.orgId}/roster`);
}

export async function updateMemberPosition(
  membershipId: string,
  position: string
) {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError();

  await requireOrgAccess(membership.orgId, { coach: true });

  await db.membership.update({
    where: { id: membershipId },
    data: { position },
  });
}

export async function updateMemberRole(
  membershipId: string,
  role: MemberRole
) {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError();

  const caller = await requireOrgAccess(membership.orgId);
  if (caller.role !== "owner") throw new AuthzError();

  await db.membership.update({
    where: { id: membershipId },
    data: { role },
  });
  revalidatePath(`/team/${membership.orgId}/roster`);
}

export async function regenerateInviteCode(orgId: string) {
  const caller = await requireOrgAccess(orgId);
  if (!["owner", "coach"].includes(caller.role)) throw new AuthzError();

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
  await requireOrgAccess(orgId, { coach: true });
  return db.organization.findUnique({
    where: { id: orgId },
  });
}
