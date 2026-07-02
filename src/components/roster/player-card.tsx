"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MoreVertical, KeyRound, Copy, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { resetMemberPassword } from "@/lib/actions/roster-actions";

interface PlayerCardProps {
  membershipId: string;
  name: string;
  email: string;
  position: string | null;
  playsStudied: number;
  lastActiveLabel: string | null;
}

export function PlayerCard({
  membershipId,
  name,
  email,
  position,
  playsStudied,
  lastActiveLabel,
}: PlayerCardProps) {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = (name || email || "?")[0]?.toUpperCase() ?? "?";

  function openResetDialog() {
    setTempPassword(null);
    setError(null);
    setDialogOpen(true);
  }

  async function handleReset() {
    setLoading(true);
    setError(null);
    try {
      const result = await resetMemberPassword(membershipId);
      setTempPassword(result.tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success("Password copied.");
    } catch {
      toast.error("Copy failed — select and copy the password manually.");
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold leading-none text-emerald-400">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {name || "Unnamed"}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {position && <span className="truncate">{position}</span>}
            <span>{playsStudied} plays studied</span>
          </div>
          {lastActiveLabel && (
            <p className="text-xs text-zinc-600">Last active: {lastActiveLabel}</p>
          )}
        </div>
        <DropdownMenu
          trigger={
            <button
              aria-label={`Actions for ${name || "player"}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem onClick={openResetDialog}>
            <KeyRound className="h-4 w-4" />
            Reset password
          </DropdownItem>
        </DropdownMenu>
      </CardContent>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Reset player password
                </Dialog.Title>
                {!tempPassword && (
                  <Dialog.Description className="mt-1 text-sm text-zinc-400">
                    Generate a new temporary password for {name || "this player"}. Their current password will stop working.
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {tempPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Share this password with the player. It won&apos;t be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white">
                    {tempPassword}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setDialogOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
