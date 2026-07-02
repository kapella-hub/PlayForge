import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import type { Membership } from "@prisma/client";

export class AuthzError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthzError";
  }
}

/** Verifies the signed-in user belongs to orgId (optionally as coach). Throws AuthzError otherwise. */
export async function requireOrgAccess(
  orgId: string,
  opts: { coach?: boolean } = {},
): Promise<Membership> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthzError();
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new AuthzError();
  if (opts.coach && !isCoachRole(membership.role)) throw new AuthzError();
  return membership;
}

/** Resolves the signed-in user's primary membership (optionally requiring coach role). Throws AuthzError. */
export async function requireMembership(opts: { coach?: boolean } = {}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthzError();
  const membership = await getUserMembership(userId);
  if (!membership) throw new AuthzError();
  if (opts.coach && !isCoachRole(membership.role)) throw new AuthzError();
  return membership;
}

/** Resolves a playbook's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requirePlaybookAccess(
  playbookId: string,
  opts: { coach?: boolean } = {},
) {
  const playbook = await db.playbook.findUnique({ where: { id: playbookId } });
  if (!playbook) throw new AuthzError();
  const membership = await requireOrgAccess(playbook.orgId, opts);
  return { playbook, membership };
}

/** Resolves a play's org (via its playbook) and verifies access. Throws AuthzError if missing or forbidden. */
export async function requirePlayAccess(
  playId: string,
  opts: { coach?: boolean } = {},
) {
  const play = await db.play.findUnique({
    where: { id: playId },
    include: { playbook: { select: { orgId: true } } },
  });
  if (!play) throw new AuthzError();
  const membership = await requireOrgAccess(play.playbook.orgId, opts);
  return { play, membership };
}

/** Resolves a game plan's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requireGamePlanAccess(
  gamePlanId: string,
  opts: { coach?: boolean } = {},
) {
  const gamePlan = await db.gamePlan.findUnique({ where: { id: gamePlanId } });
  if (!gamePlan) throw new AuthzError();
  const membership = await requireOrgAccess(gamePlan.orgId, opts);
  return { gamePlan, membership };
}

/** Resolves a quiz's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requireQuizAccess(
  quizId: string,
  opts: { coach?: boolean } = {},
) {
  const quiz = await db.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AuthzError();
  const membership = await requireOrgAccess(quiz.orgId, opts);
  return { quiz, membership };
}

/** Resolves a practice plan's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requirePracticePlanAccess(
  planId: string,
  opts: { coach?: boolean } = {},
) {
  const plan = await db.practicePlan.findUnique({ where: { id: planId } });
  if (!plan) throw new AuthzError();
  const membership = await requireOrgAccess(plan.orgId, opts);
  return { plan, membership };
}
