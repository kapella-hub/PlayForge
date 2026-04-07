"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mirrorPlay as mirrorCanvasData } from "@/engine/mirror";
import { deserializeCanvas } from "@/engine/serialization";
import type { PlayType, Prisma } from "@prisma/client";

export async function getPlay(id: string) {
  const play = await db.play.findUnique({
    where: { id },
    include: {
      assignments: true,
      playbook: true,
    },
  });
  return play;
}

export async function getPlaysByPlaybook(playbookId: string) {
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await db.play.create({
    data: {
      playbookId: data.playbookId,
      name: data.name,
      formation: data.formation,
      playType: data.playType,
      canvasData: data.canvasData ?? {},
      animationData: data.animationData ?? {},
      notes: data.notes,
      createdById: session.user.id,
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await db.play.update({
    where: { id },
    data,
  });

  return play;
}

export async function deletePlay(id: string, playbookId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.play.delete({
    where: { id },
  });

  revalidatePath(`/playbooks/${playbookId}`);
}

export async function duplicatePlay(playId: string, newName?: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
      createdById: session.user.id,
    },
  });

  revalidatePath(`/playbooks/${original.playbookId}`);
  return play;
}

export async function mirrorPlayAction(playId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
      createdById: session.user.id,
    },
  });

  revalidatePath(`/playbooks/${original.playbookId}`);
  return play;
}

export async function getPlaysByOrg(orgId: string) {
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
