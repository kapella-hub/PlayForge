import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlay } from "@/lib/actions/play-actions";
import { recordPlayView } from "@/lib/actions/progress-actions";
import { PlayViewer } from "@/components/play/play-viewer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const play = await getPlay(id);
  if (!play) notFound();

  // Record view for spaced repetition tracking
  await recordPlayView(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">{play.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{play.formation}</Badge>
          <Badge variant="outline" className="text-[10px]">
            {play.playType.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Play Viewer */}
      <PlayViewer canvasData={play.canvasData} />

      {/* Situation Tags */}
      {play.situationTags.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Situations
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {play.situationTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Coach Notes */}
      {play.notes && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Coach Notes
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-300">
              {play.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Film Link */}
      {play.filmUrl && (
        <a
          href={play.filmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          <ExternalLink className="h-4 w-4" />
          Watch Film
        </a>
      )}
    </div>
  );
}
