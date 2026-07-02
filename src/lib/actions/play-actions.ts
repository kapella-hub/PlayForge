"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { mirrorPlay as mirrorCanvasData } from "@/engine/mirror";
import { deserializeCanvas } from "@/engine/serialization";
import type { PlayType, Prisma } from "@prisma/client";
import {
  requireOrgAccess,
  requirePlayAccess,
  requirePlaybookAccess,
} from "@/lib/authz";

export async function getPlay(id: string) {
  const play = await db.play.findUnique({
    where: { id },
    include: {
      assignments: true,
      playbook: true,
    },
  });
  if (!play) return null;
  await requireOrgAccess(play.playbook.orgId);
  return play;
}

export async function getPlaysByPlaybook(playbookId: string) {
  await requirePlaybookAccess(playbookId, { coach: true });
  const plays = await db.play.findMany({
    where: { playbookId },
    orderBy: { createdAt: "desc" },
  });
  return plays;
}

export async function createPlay(data: {
  playbookId: string;
  name: string;
  formation: string;
  playType: PlayType;
  canvasData?: unknown;
  animationData?: unknown;
  notes?: string;
}) {
  const { membership } = await requirePlaybookAccess(data.playbookId, {
    coach: true,
  });

  const play = await db.play.create({
    data: {
      playbookId: data.playbookId,
      name: data.name,
      formation: data.formation,
      playType: data.playType,
      canvasData: data.canvasData ?? {},
      animationData: data.animationData ?? {},
      notes: data.notes,
      createdById: membership.userId,
    },
  });

  return play;
}

export async function updatePlay(
  id: string,
  data: {
    name?: string;
    formation?: string;
    playType?: PlayType;
    canvasData?: Prisma.InputJsonValue;
    animationData?: Prisma.InputJsonValue;
    notes?: string;
    filmUrl?: string | null;
    filmTimestamp?: number | null;
    thumbnailUrl?: string;
    situationTags?: string[];
  },
) {
  const { membership } = await requirePlayAccess(id, { coach: true });

  // Snapshot the current state as a version before updating
  const current = await db.play.findUnique({ where: { id } });
  if (current) {
    const lastVersion = await db.playVersion.findFirst({
      where: { playId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;
    await db.playVersion.create({
      data: {
        playId: id,
        version: nextVersion,
        canvasData: current.canvasData ?? {},
        animationData: current.animationData ?? {},
        notes: current.notes,
        createdById: membership.userId,
      },
    });
  }

  const play = await db.play.update({
    where: { id },
    data,
  });

  return play;
}

export async function getPlayVersions(playId: string) {
  await requirePlayAccess(playId, { coach: true });
  return db.playVersion.findMany({
    where: { playId },
    orderBy: { version: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
}

export async function restorePlayVersion(playId: string, versionId: string) {
  const { membership } = await requirePlayAccess(playId, { coach: true });

  const version = await db.playVersion.findUnique({
    where: { id: versionId },
  });
  if (!version || version.playId !== playId) {
    throw new Error("Version not found");
  }

  // Snapshot current state before restoring (safety net)
  const current = await db.play.findUnique({ where: { id: playId } });
  if (current) {
    const lastVersion = await db.playVersion.findFirst({
      where: { playId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;
    await db.playVersion.create({
      data: {
        playId,
        version: nextVersion,
        canvasData: current.canvasData ?? {},
        animationData: current.animationData ?? {},
        notes: `Auto-saved before restoring v${version.version}`,
        createdById: membership.userId,
      },
    });
  }

  // Restore the version's data into the play
  const play = await db.play.update({
    where: { id: playId },
    data: {
      canvasData: version.canvasData ?? {},
      animationData: version.animationData ?? {},
    },
  });

  revalidatePath(`/designer`);
  return play;
}

export async function deletePlay(id: string, playbookId: string) {
  await requirePlayAccess(id, { coach: true });

  await db.play.delete({
    where: { id },
  });

  revalidatePath(`/playbooks/${playbookId}`);
}

export async function duplicatePlay(playId: string, newName?: string) {
  const { membership } = await requirePlayAccess(playId, { coach: true });

  const original = await db.play.findUnique({
    where: { id: playId },
  });

  if (!original) throw new Error("Play not found");

  const play = await db.play.create({
    data: {
      playbookId: original.playbookId,
      name: newName ?? `${original.name} (Copy)`,
      formation: original.formation,
      playType: original.playType,
      situationTags: original.situationTags,
      canvasData: original.canvasData ?? {},
      animationData: original.animationData ?? {},
      notes: original.notes,
      thumbnailUrl: original.thumbnailUrl,
      createdById: membership.userId,
    },
  });

  revalidatePath(`/playbooks/${original.playbookId}`);
  return play;
}

export async function mirrorPlayAction(playId: string) {
  const { membership } = await requirePlayAccess(playId, { coach: true });

  const original = await db.play.findUnique({
    where: { id: playId },
  });

  if (!original) throw new Error("Play not found");

  const canvas = deserializeCanvas(original.canvasData);
  const mirrored = mirrorCanvasData(canvas);

  const play = await db.play.create({
    data: {
      playbookId: original.playbookId,
      name: `${original.name} (Mirrored)`,
      formation: original.formation,
      playType: original.playType,
      situationTags: original.situationTags,
      canvasData: JSON.parse(JSON.stringify(mirrored)),
      animationData: original.animationData ?? {},
      notes: original.notes,
      filmUrl: original.filmUrl,
      filmTimestamp: original.filmTimestamp,
      thumbnailUrl: null,
      createdById: membership.userId,
    },
  });

  revalidatePath(`/playbooks/${original.playbookId}`);
  return play;
}

export async function getPlaysByOrg(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.play.findMany({
    where: {
      playbook: { orgId },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      formation: true,
      playType: true,
      thumbnailUrl: true,
    },
  });
}
