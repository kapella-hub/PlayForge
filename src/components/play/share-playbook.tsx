"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sharePlaybook,
  revokePlaybookShare,
} from "@/lib/actions/playbook-actions";
import { Share2, X, Loader2 } from "lucide-react";

interface ShareRecord {
  id: string;
  sharedWith: { name: string; slug: string };
  createdAt: Date;
}

export function SharePlaybook({
  playbookId,
  existingShares,
}: {
  playbookId: string;
  existingShares: ShareRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [shares, setShares] = useState(existingShares);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleShare() {
    if (!slug.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await sharePlaybook(playbookId, slug.trim());
        setShares((prev) => [
          ...prev,
          {
            id: result.id,
            sharedWith: { name: result.orgName, slug: slug.trim() },
            createdAt: new Date(),
          },
        ]);
        setSlug("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to share playbook",
        );
      }
    });
  }

  function handleRevoke(shareId: string) {
    startTransition(async () => {
      await revokePlaybookShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111122] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Share Playbook</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Organization slug or invite code"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleShare()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleShare} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Share"
          )}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {shares.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Shared with
          </p>
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-white">
                  {share.sharedWith.name}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {share.sharedWith.slug}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(share.id)}
                className="text-xs text-red-400 hover:text-red-300"
                disabled={isPending}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
