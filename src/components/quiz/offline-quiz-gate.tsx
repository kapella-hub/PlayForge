"use client";

import type { ReactNode } from "react";
import { useOnline } from "@/lib/use-online";
import { QuizOfflineBanner } from "./quiz-offline-banner";

export function OfflineQuizGate({ children }: { children: ReactNode }) {
  const online = useOnline();
  return (
    <>
      {!online && <QuizOfflineBanner />}
      <div
        className={online ? undefined : "pointer-events-none opacity-60"}
        aria-disabled={online ? undefined : true}
      >
        {children}
      </div>
    </>
  );
}
