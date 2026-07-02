"use server";

import { db } from "@/lib/db";
import { requireMembership } from "@/lib/authz";

function assertHttpUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Only http(s) links are allowed");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) links are allowed");
  }
}

export async function getTeamFiles() {
  const membership = await requireMembership({ coach: true });
  return db.teamFile.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTeamFile(data: {
  title: string;
  url: string;
  category: string;
}) {
  const membership = await requireMembership({ coach: true });
  assertHttpUrl(data.url);
  return db.teamFile.create({
    data: {
      orgId: membership.orgId,
      title: data.title,
      url: data.url,
      category: data.category,
      createdById: membership.userId,
    },
  });
}

export async function updateTeamFile(
  id: string,
  data: { title: string; url: string },
) {
  const membership = await requireMembership({ coach: true });
  assertHttpUrl(data.url);
  const result = await db.teamFile.updateMany({
    where: { id, orgId: membership.orgId },
    data: { title: data.title, url: data.url },
  });
  if (result.count === 0) {
    throw new Error("Team file not found");
  }
}

export async function deleteTeamFile(id: string) {
  const membership = await requireMembership({ coach: true });
  const result = await db.teamFile.deleteMany({
    where: { id, orgId: membership.orgId },
  });
  if (result.count === 0) {
    throw new Error("Team file not found");
  }
}
