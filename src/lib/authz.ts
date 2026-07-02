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
