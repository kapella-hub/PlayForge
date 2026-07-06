"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { duplicatePlay, deletePlay, mirrorPlayAction } from "@/lib/actions/play-actions";
import { MoreVertical, Pencil, Copy, Trash2, FlipHorizontal } from "lucide-react";

interface PlayCardProps {
  id: string;
  name: string;
  formation: string;
  playType: string;
  thumbnailUrl?: string | null;
  playbookId: string;
}

export function PlayCard({
  id,
  name,
  formation,
  playType,
  thumbnailUrl,
  playbookId,
}: PlayCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDuplicate = () => {
    startTransition(async () => {
      await duplicatePlay(id);
    });
  };

  const handleMirror = () => {
    startTransition(async () => {
      await mirrorPlayAction(id);
    });
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    startTransition(async () => {
      await deletePlay(id, playbookId);
    });
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative">
      <Link href={`/designer?playId=${id}`}>
        <Card className="transition-colors">
          {/* Thumbnail area */}
          <div className="flex h-36 items-center justify-center rounded-t-xl bg-secondary">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={name}
                className="h-full w-full rounded-t-xl object-cover"
              />
            ) : (
              <span className="text-xs text-muted-foreground/70">No preview</span>
            )}
          </div>

          <CardContent className="p-3">
            <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{formation}</span>
              <Badge variant="outline" className="text-[10px]">
                {playType.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Dropdown menu overlay */}
      <div className="absolute right-2 top-2">
        <DropdownMenu
          trigger={
            <button
              className="rounded-md bg-card/70 p-1 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Play actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem asChild>
            <Link href={`/designer?playId=${id}`} className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/85 outline-none transition-colors hover:bg-secondary hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </DropdownItem>
          <DropdownItem onClick={handleDuplicate}>
            <Copy className="h-3.5 w-3.5" />
            {isPending ? "Duplicating..." : "Duplicate"}
          </DropdownItem>
          <DropdownItem onClick={handleMirror}>
            <FlipHorizontal className="h-3.5 w-3.5" />
            {isPending ? "Mirroring..." : "Mirror"}
          </DropdownItem>
          <DropdownItem onClick={handleDelete} variant="destructive">
            <Trash2 className="h-3.5 w-3.5" />
            {showDeleteConfirm ? "Confirm Delete" : "Delete"}
          </DropdownItem>
        </DropdownMenu>
      </div>
    </div>
  );
}
