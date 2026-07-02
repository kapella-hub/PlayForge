"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/lib/actions/account-actions";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success("Password updated.");
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-white">
                Change password
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                Enter your current password and choose a new one.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Confirm new password
              </label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Update password"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
