"use server";

import { db } from "@/lib/db";
import {
  requireOrgAccess,
  requireGamePlanAccess,
  requirePlayAccess,
  AuthzError,
} from "@/lib/authz";

export async function getGamePlans(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.gamePlan.findMany({
    where: { orgId },
    include: {
      _count: { select: { plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveGamePlan(orgId: string) {
  await requireOrgAccess(orgId);
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
  const membership = await requireOrgAccess(data.orgId, { coach: true });

  return db.gamePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      week: data.week,
      opponent: data.opponent,
      createdById: membership.userId,
    },
  });
}

export async function setActiveGamePlan(orgId: string, gamePlanId: string) {
  const { gamePlan } = await requireGamePlanAccess(gamePlanId, { coach: true });

  // Deactivate all game plans for the game plan's org (validated, not client-supplied)
  await db.gamePlan.updateMany({
    where: { orgId: gamePlan.orgId },
    data: { isActive: false },
  });

  // Activate the selected one
  return db.gamePlan.update({
    where: { id: gamePlan.id },
    data: { isActive: true },
  });
}

export async function addPlayToGamePlan(gamePlanId: string, playId: string) {
  const { gamePlan } = await requireGamePlanAccess(gamePlanId, { coach: true });
  const { play } = await requirePlayAccess(playId, { coach: true });
  if (play.playbook.orgId !== gamePlan.orgId) throw new AuthzError();

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
  await requireGamePlanAccess(gamePlanId, { coach: true });

  return db.gamePlanPlay.delete({
    where: { gamePlanId_playId: { gamePlanId, playId } },
  });
}

export async function getGamePlan(id: string) {
  const gamePlan = await db.gamePlan.findUnique({
    where: { id },
    include: {
      plays: {
        include: { play: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!gamePlan) return null;
  await requireOrgAccess(gamePlan.orgId, { coach: true });
  return gamePlan;
}

export async function reorderGamePlanPlays(
  gamePlanId: string,
  playIds: string[],
) {
  await requireGamePlanAccess(gamePlanId, { coach: true });

  // Update sortOrder for each play based on array index
  await Promise.all(
    playIds.map((playId, index) =>
      db.gamePlanPlay.update({
        where: { gamePlanId_playId: { gamePlanId, playId } },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function deleteGamePlan(id: string) {
  await requireGamePlanAccess(id, { coach: true });

  return db.gamePlan.delete({ where: { id } });
}
