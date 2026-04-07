import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { getOrganization } from "@/lib/actions/roster-actions";
import { InviteCodeCard } from "@/components/roster/invite-code-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const tierLabels: Record<string, string> = {
  youth: "Youth/Flag",
  high_school: "High School",
  college: "College",
  pro: "Professional",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership || !isCoachRole(membership.role)) redirect("/login");

  const orgId = membership.orgId;
  const organization = await getOrganization(orgId);
  if (!organization) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500">
          Manage your organization settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Name</p>
              <p className="text-sm font-medium text-zinc-100">
                {organization.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tier</p>
              <p className="text-sm font-medium text-zinc-100">
                {tierLabels[organization.tier] ?? organization.tier}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Slug</p>
              <p className="text-sm font-mono text-zinc-400">
                {organization.slug}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invite Code */}
        <InviteCodeCard code={organization.inviteCode} orgId={orgId} />

        {/* Team Files */}
        <Link href="/settings/files">
          <Card className="transition-colors hover:border-zinc-700">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <FileText className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-100">Team Files</p>
                <p className="text-xs text-zinc-500">
                  Manage links to team rules, schedules, goals, and videos.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-600" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
