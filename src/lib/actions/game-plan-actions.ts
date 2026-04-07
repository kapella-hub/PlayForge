"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getGamePlans(orgId: string) {
  return db.gamePlan.findMany({
    where: { orgId },
    include: {
      _count: { select: { plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveGamePlan(orgId: string) {
  return db.gamePlan.findFirst({
    where: { orgId, isActive: true },
    include: {
      plays: {
        include: {
          play: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createGamePlan(data: {
  orgId: string;
  name: string;
  week?: number;
  opponent?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.gamePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      week: data.week,
      opponent: data.opponent,
      createdById: session.user.id,
    },
  });
}

export async function setActiveGamePlan(orgId: string, gamePlanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Deactivate all game plans for this org
  await db.gamePlan.updateMany({
    where: { orgId },
    data: { isActive: false },
  });

  // Activate the selected one
  return db.gamePlan.update({
    where: { id: gamePlanId },
    data: { isActive: true },
  });
}

export async function addPlayToGamePlan(gamePlanId: string, playId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get the next sort order
  const lastPlay = await db.gamePlanPlay.findFirst({
    where: { gamePlanId },
    orderBy: { sortOrder: "desc" },
  });

  const sortOrder = (lastPlay?.sortOrder ?? -1) + 1;

  return db.gamePlanPlay.create({
    data: {
      gamePlanId,
      playId,
      sortOrder,
    },
  });
}

export async function removePlayFromGamePlan(
  gamePlanId: string,
  playId: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.gamePlanPlay.delete({
    where: { gamePlanId_playId: { gamePlanId, playId } },
  });
}
