"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MoreVertical, KeyRound, Copy } from "lucide-react";
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

  function handleOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setTempPassword(null);
      setError(null);
    }
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

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Reset player password</DialogTitle>
            <DialogDescription>
              {tempPassword
                ? "Share this one-time password with the player. It won't be shown again."
                : `Generate a new temporary password for ${name || "this player"}. Their current password will stop working.`}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
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
                <Button type="button" onClick={() => handleOpenChange(false)}>
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
                  onClick={() => handleOpenChange(false)}
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
        </DialogContent>
      </Dialog>
    </Card>
  );
}
