import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaysByPlaybook } from "@/lib/actions/play-actions";
import { PlaybookFilters } from "@/components/play/playbook-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const playbook = await db.playbook.findUnique({
    where: { id },
  });

  if (!playbook) redirect("/playbooks");

  const plays = await getPlaysByPlaybook(id);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/playbooks"
          className="mb-4 inline-flex items-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Playbooks
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{playbook.name}</h1>
            <Badge
              variant={playbook.side === "offense" ? "default" : "destructive"}
            >
              {playbook.side}
            </Badge>
          </div>
          <Link href={`/designer?playbookId=${id}`}>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              New Play
            </Button>
          </Link>
        </div>

        {playbook.description && (
          <p className="mt-2 text-sm text-zinc-500">{playbook.description}</p>
        )}
      </div>

      {/* Plays with filters */}
      {plays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <FileText className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No plays yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Click &ldquo;New Play&rdquo; to open the designer and create your
            first play.
          </p>
        </div>
      ) : (
        <PlaybookFilters
          plays={plays.map((p) => ({
            id: p.id,
            name: p.name,
            formation: p.formation,
            playType: p.playType,
            thumbnailUrl: p.thumbnailUrl,
            situationTags: p.situationTags ?? [],
            createdAt: p.createdAt,
          }))}
          playbookId={id}
        />
      )}
    </div>
  );
}
