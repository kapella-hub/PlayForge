"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Side, Visibility } from "@prisma/client";

export async function getPlaybooks(orgId: string) {
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = formData.get("orgId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const side = (formData.get("side") as Side) || "offense";
  const visibility =
    (formData.get("visibility") as Visibility) || "private";

  if (!orgId || !name) {
    throw new Error("Organization ID and name are required");
  }

  const playbook = await db.playbook.create({
    data: {
      orgId,
      name,
      description,
      side,
      visibility,
      createdById: session.user.id,
    },
  });

  return playbook;
}

export async function deletePlaybook(id: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.playbook.delete({
    where: { id },
  });
}

export async function sharePlaybook(playbookId: string, targetSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Find the target org by slug or invite code
  const targetOrg = await db.organization.findFirst({
    where: {
      OR: [{ slug: targetSlug }, { inviteCode: targetSlug }],
    },
  });

  if (!targetOrg) {
    throw new Error("Organization not found. Check the slug or invite code.");
  }

  // Verify the playbook exists and belongs to user's org
  const playbook = await db.playbook.findUnique({
    where: { id: playbookId },
  });

  if (!playbook) {
    throw new Error("Playbook not found.");
  }

  if (targetOrg.id === playbook.orgId) {
    throw new Error("Cannot share a playbook with its own organization.");
  }

  const share = await db.playbookShare.create({
    data: {
      playbookId,
      sharedWithOrgId: targetOrg.id,
      sharedById: session.user.id,
    },
  });

  return { id: share.id, orgName: targetOrg.name };
}

export async function getSharedPlaybooks(orgId: string) {
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.playbookShare.delete({ where: { id: shareId } });
}

export async function importSharedPlaybook(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const share = await db.playbookShare.findUnique({
    where: { id: shareId },
    include: {
      playbook: {
        include: { plays: true },
      },
    },
  });

  if (!share) throw new Error("Share not found.");

  // Find user's org
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
  });

  if (!membership) throw new Error("No organization membership found.");

  // Create a copy of the playbook
  const newPlaybook = await db.playbook.create({
    data: {
      orgId: membership.orgId,
      name: `${share.playbook.name} (imported)`,
      description: share.playbook.description,
      side: share.playbook.side,
      visibility: "private",
      createdById: session.user.id,
      plays: {
        create: share.playbook.plays.map((play) => ({
          name: play.name,
          formation: play.formation,
          playType: play.playType,
          situationTags: play.situationTags,
          canvasData: play.canvasData ?? {},
          animationData: play.animationData ?? {},
          notes: play.notes,
          createdById: session.user.id,
        })),
      },
    },
  });

  return newPlaybook;
}
