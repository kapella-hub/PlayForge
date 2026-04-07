import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getUserMembership(session.user.id);

  if (!membership) {
    redirect("/join");
  }

  if (isCoachRole(membership.role)) {
    redirect("/dashboard");
  }

  redirect("/home");
}
