import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getPracticePlan } from "@/lib/actions/practice-actions";
import { getPlaybooks } from "@/lib/actions/playbook-actions";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import { PracticePlanEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function PracticePlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const plan = await getPracticePlan(id);
  if (!plan) redirect("/practice");

  // Get all plays in the org for the play picker
  const plays = await db.play.findMany({
    where: { playbook: { orgId: membership.orgId } },
    select: { id: true, name: true, formation: true, playType: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/practice"
          className="mb-4 inline-flex items-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Practice Plans
        </Link>
      </div>

      <PracticePlanEditor
        plan={{
          id: plan.id,
          name: plan.name,
          date: plan.date ? plan.date.toISOString().slice(0, 10) : null,
          notes: plan.notes,
          periods: plan.periods.map((p) => ({
            id: p.id,
            name: p.name,
            durationMin: p.durationMin,
            sortOrder: p.sortOrder,
            playIds: p.playIds,
            notes: p.notes,
          })),
        }}
        availablePlays={plays}
      />
    </div>
  );
}
