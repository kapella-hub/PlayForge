import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline — PlayForge",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <WifiOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Recently viewed plays are available. Quizzes need a connection — reconnect
        to pick up where you left off.
      </p>
      <a
        href="/"
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Retry
      </a>
    </main>
  );
}
