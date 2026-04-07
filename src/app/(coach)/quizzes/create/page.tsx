import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { QuizCreateClient } from "./quiz-create-client";

export const dynamic = "force-dynamic";

export default async function QuizCreatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  return <QuizCreateClient orgId={membership.orgId} />;
}

