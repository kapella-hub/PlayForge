import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getPlaybooks, getSharedPlaybooks } from "@/lib/actions/playbook-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Share2 } from "lucide-react";
import { ImportPlaybookButton } from "./import-button";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/login");

  const [playbooks, sharedPlaybooks] = await Promise.all([
    getPlaybooks(membership.orgId),
    getSharedPlaybooks(membership.orgId),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Playbooks</h1>
          <p className="text-sm text-zinc-500">
            Organize your plays into playbooks by scheme or situation.
          </p>
        </div>
        {/* TODO: Wire up create playbook modal */}
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Playbook
        </Button>
      </div>

      {playbooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <BookOpen className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No playbooks yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create your first playbook to start building plays.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((pb) => (
            <Link key={pb.id} href={`/playbooks/${pb.id}`}>
              <Card className="transition-colors hover:border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{pb.name}</span>
                    <Badge
                      variant={pb.side === "offense" ? "default" : "destructive"}
                      className="ml-2 shrink-0"
                    >
                      {pb.side}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">
                    {pb._count.plays} play{pb._count.plays !== 1 ? "s" : ""}
                  </p>
                  {pb.description && (
                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {pb.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Shared with you */}
      {sharedPlaybooks.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-zinc-500" />
            <h2 className="text-lg font-semibold text-white">
              Shared with you
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedPlaybooks.map((share) => (
              <Card
                key={share.id}
                className="transition-colors hover:border-zinc-700"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{share.playbook.name}</span>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <Badge
                        variant={
                          share.playbook.side === "offense"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {share.playbook.side}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-indigo-500/50 text-indigo-400"
                      >
                        Shared
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">
                    {share.playbook._count.plays} play
                    {share.playbook._count.plays !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    From {share.playbook.org.name}
                  </p>
                  <div className="mt-3">
                    <ImportPlaybookButton shareId={share.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
