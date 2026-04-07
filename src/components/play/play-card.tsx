import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlayCardProps {
  id: string;
  name: string;
  formation: string;
  playType: string;
  thumbnailUrl?: string | null;
}

export function PlayCard({
  id,
  name,
  formation,
  playType,
  thumbnailUrl,
}: PlayCardProps) {
  return (
    <Link href={`/designer?playId=${id}`}>
      <Card className="transition-colors hover:border-zinc-700">
        {/* Thumbnail area */}
        <div className="flex h-36 items-center justify-center rounded-t-xl bg-green-900/30">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={name}
              className="h-full w-full rounded-t-xl object-cover"
            />
          ) : (
            <span className="text-xs text-zinc-600">No preview</span>
          )}
        </div>

        <CardContent className="p-3">
          <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-zinc-500">{formation}</span>
            <Badge variant="outline" className="text-[10px]">
              {playType.replace("_", " ")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
