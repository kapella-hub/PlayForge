"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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
}
