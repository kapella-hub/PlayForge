"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { duplicatePlay, deletePlay } from "@/lib/actions/play-actions";
import { MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";

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

      {/* Dropdown menu overlay */}
      <div className="absolute right-2 top-2">
        <DropdownMenu
          trigger={
            <button
              className="rounded-md bg-zinc-900/70 p-1 text-zinc-400 backdrop-blur-sm transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Play actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem onClick={() => {}}>
            <Link href={`/designer?playId=${id}`} className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </DropdownItem>
          <DropdownItem onClick={handleDuplicate}>
            <Copy className="h-3.5 w-3.5" />
            {isPending ? "Duplicating..." : "Duplicate"}
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
