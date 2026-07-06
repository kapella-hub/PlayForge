"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireOrgAccess,
  requirePracticePlanAccess,
  AuthzError,
} from "@/lib/authz";

export async function getPracticePlans(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const plans = await db.practicePlan.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { periods: true } },
      periods: { select: { durationMin: true } },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    totalDuration: plan.periods.reduce((sum, p) => sum + p.durationMin, 0),
    periodCount: plan._count.periods,
  }));
}

export async function getPracticePlan(id: string) {
  const plan = await db.practicePlan.findUnique({
    where: { id },
    include: {
      periods: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!plan) return null;
  await requireOrgAccess(plan.orgId, { coach: true });
  return plan;
}

export async function createPracticePlan(data: {
  orgId: string;
  name: string;
  date?: string | null;
  notes?: string | null;
}) {
  const membership = await requireOrgAccess(data.orgId, { coach: true });

  const plan = await db.practicePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      date: data.date ? new Date(data.date) : null,
      notes: data.notes ?? null,
      createdById: membership.userId,
    },
  });

  revalidatePath("/practice");
  return plan;
}

export async function updatePracticePlan(
  id: string,
  data: { name?: string; date?: string | null; notes?: string | null },
) {
  await requirePracticePlanAccess(id, { coach: true });

  const plan = await db.practicePlan.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.date !== undefined && {
        date: data.date ? new Date(data.date) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  revalidatePath("/practice");
  revalidatePath(`/practice/${id}`);
  return plan;
}

export async function deletePracticePlan(id: string) {
  await requirePracticePlanAccess(id, { coach: true });

  await db.practicePlan.delete({ where: { id } });
  revalidatePath("/practice");
}

export async function addPracticePeriod(data: {
  practicePlanId: string;
  name: string;
  durationMin: number;
  playIds?: string[];
  notes?: string | null;
}) {
  await requirePracticePlanAccess(data.practicePlanId, { coach: true });

  // Get next sort order
  const maxOrder = await db.practicePeriod.findFirst({
    where: { practicePlanId: data.practicePlanId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const period = await db.practicePeriod.create({
    data: {
      practicePlanId: data.practicePlanId,
      name: data.name,
      durationMin: data.durationMin,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      playIds: data.playIds ?? [],
      notes: data.notes ?? null,
    },
  });

  revalidatePath(`/practice/${data.practicePlanId}`);
  return period;
}

export async function updatePracticePeriod(
  id: string,
  data: {
    name?: string;
    durationMin?: number;
    playIds?: string[];
    notes?: string | null;
  },
) {
  const period = await db.practicePeriod.findUnique({
    where: { id },
    include: { practicePlan: { select: { orgId: true } } },
  });
  if (!period) throw new AuthzError();
  await requireOrgAccess(period.practicePlan.orgId, { coach: true });

  const updated = await db.practicePeriod.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
      ...(data.playIds !== undefined && { playIds: data.playIds }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  revalidatePath(`/practice/${period.practicePlanId}`);
  return updated;
}

export async function deletePracticePeriod(id: string) {
  const period = await db.practicePeriod.findUnique({
    where: { id },
    include: { practicePlan: { select: { orgId: true } } },
  });
  if (!period) throw new AuthzError();
  await requireOrgAccess(period.practicePlan.orgId, { coach: true });

  await db.practicePeriod.delete({ where: { id } });
  revalidatePath(`/practice/${period.practicePlanId}`);
}

export async function reorderPracticePeriods(
  planId: string,
  periodIds: string[],
) {
  await requirePracticePlanAccess(planId, { coach: true });

  await db.$transaction(
    periodIds.map((id, index) =>
      db.practicePeriod.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidatePath(`/practice/${planId}`);
}
