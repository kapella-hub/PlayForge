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
