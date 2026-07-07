"use client";

import { Download, Share } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useInstallPrompt } from "@/lib/use-install-prompt";

export function InstallCard({ userId }: { userId: string }) {
  const { canInstall, showIosHint, promptInstall, dismiss } = useInstallPrompt(userId);
  if (!canInstall && !showIosHint) return null;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/30">
          {canInstall ? (
            <Download className="h-5 w-5 text-primary-emphasis" />
          ) : (
            <Share className="h-5 w-5 text-primary-emphasis" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install PlayForge</p>
          {canInstall ? (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add PlayForge to your home screen for quick, full-screen access.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={promptInstall}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Install PlayForge
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap Share, then &ldquo;Add to Home Screen&rdquo; to install.
              </p>
              <div className="mt-2">
                <button
                  onClick={dismiss}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
