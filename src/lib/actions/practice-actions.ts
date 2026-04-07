"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function getPracticePlans(orgId: string) {
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
  return plan;
}

export async function createPracticePlan(data: {
  orgId: string;
  name: string;
  date?: string | null;
  notes?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plan = await db.practicePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      date: data.date ? new Date(data.date) : null,
      notes: data.notes ?? null,
      createdById: session.user.id,
    },
  });

  return plan;
}

export async function updatePracticePlan(
  id: string,
  data: { name?: string; date?: string | null; notes?: string | null },
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  return plan;
}

export async function deletePracticePlan(id: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.practicePlan.delete({ where: { id } });
}

export async function addPracticePeriod(data: {
  practicePlanId: string;
  name: string;
  durationMin: number;
  playIds?: string[];
  notes?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const period = await db.practicePeriod.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
      ...(data.playIds !== undefined && { playIds: data.playIds }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return period;
}

export async function deletePracticePeriod(id: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.practicePeriod.delete({ where: { id } });
}

export async function reorderPracticePeriods(
  planId: string,
  periodIds: string[],
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.$transaction(
    periodIds.map((id, index) =>
      db.practicePeriod.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}
