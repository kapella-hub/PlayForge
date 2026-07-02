"use server";

import { db } from "@/lib/db";
import type { Side, Visibility } from "@prisma/client";
import { requireOrgAccess, requirePlaybookAccess, AuthzError } from "@/lib/authz";

export async function getPlaybooks(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const playbooks = await db.playbook.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { plays: true } },
    },
  });
  return playbooks;
}

export async function createPlaybook(formData: FormData) {
  const orgId = formData.get("orgId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const side = (formData.get("side") as Side) || "offense";
  const visibility =
    (formData.get("visibility") as Visibility) || "private";

  if (!orgId || !name) {
    throw new Error("Organization ID and name are required");
  }

  const membership = await requireOrgAccess(orgId, { coach: true });

  const playbook = await db.playbook.create({
    data: {
      orgId,
      name,
      description,
      side,
      visibility,
      createdById: membership.userId,
    },
  });

  return playbook;
}

export async function deletePlaybook(id: string) {
  await requirePlaybookAccess(id, { coach: true });

  await db.playbook.delete({
    where: { id },
  });
}

export async function sharePlaybook(playbookId: string, targetSlug: string) {
  const { playbook, membership } = await requirePlaybookAccess(playbookId, {
    coach: true,
  });

  // Find the target org by slug or invite code
  const targetOrg = await db.organization.findFirst({
    where: {
      OR: [{ slug: targetSlug }, { inviteCode: targetSlug }],
    },
  });

  if (!targetOrg) {
    throw new Error("Organization not found. Check the slug or invite code.");
  }

  if (targetOrg.id === playbook.orgId) {
    throw new Error("Cannot share a playbook with its own organization.");
  }

  const share = await db.playbookShare.create({
    data: {
      playbookId,
      sharedWithOrgId: targetOrg.id,
      sharedById: membership.userId,
    },
  });

  return { id: share.id, orgName: targetOrg.name };
}

export async function getSharedPlaybooks(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const shares = await db.playbookShare.findMany({
    where: { sharedWithOrgId: orgId },
    include: {
      playbook: {
        include: {
          org: { select: { name: true } },
          _count: { select: { plays: true } },
        },
      },
      sharedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return shares;
}

export async function revokePlaybookShare(shareId: string) {
  const share = await db.playbookShare.findUnique({
    where: { id: shareId },
    include: { playbook: { select: { orgId: true } } },
  });
  if (!share) throw new AuthzError();
  await requireOrgAccess(share.playbook.orgId, { coach: true });

  await db.playbookShare.delete({ where: { id: shareId } });
}

export async function importSharedPlaybook(shareId: string) {
  const share = await db.playbookShare.findUnique({
    where: { id: shareId },
    include: {
      playbook: {
        include: { plays: true },
      },
    },
  });

  if (!share) throw new AuthzError();

  // Caller must be a coach of the org the playbook was shared with.
  const membership = await requireOrgAccess(share.sharedWithOrgId, {
    coach: true,
  });

  // Create a copy of the playbook in the caller's org
  const newPlaybook = await db.playbook.create({
    data: {
      orgId: membership.orgId,
      name: `${share.playbook.name} (imported)`,
      description: share.playbook.description,
      side: share.playbook.side,
      visibility: "private",
      createdById: membership.userId,
      plays: {
        create: share.playbook.plays.map((play) => ({
          name: play.name,
          formation: play.formation,
          playType: play.playType,
          situationTags: play.situationTags,
          canvasData: play.canvasData ?? {},
          animationData: play.animationData ?? {},
          notes: play.notes,
          createdById: membership.userId,
        })),
      },
    },
  });

  return newPlaybook;
}
