import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getPracticePlans } from "@/lib/actions/practice-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Calendar, Clock } from "lucide-react";
import { CreatePracticePlanButton } from "./create-button";

export const dynamic = "force-dynamic";

export default async function PracticePlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const plans = await getPracticePlans(membership.orgId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Plans</h1>
          <p className="text-sm text-zinc-500">
            Build and organize your practice schedule with periods and plays.
          </p>
        </div>
        <CreatePracticePlanButton orgId={membership.orgId} />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <ClipboardList className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No practice plans yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create your first practice plan to organize your sessions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/practice/${plan.id}`}>
              <Card className="transition-colors hover:border-zinc-700">
                <CardContent className="p-5">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {plan.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-500">
                    {plan.date && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(plan.date).toLocaleDateString()}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <ClipboardList className="h-3 w-3" />
                      {plan.periodCount}{" "}
                      {plan.periodCount === 1 ? "period" : "periods"}
                    </p>
                    {plan.totalDuration > 0 && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {plan.totalDuration} min total
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
