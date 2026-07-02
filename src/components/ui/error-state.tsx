"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] py-20 text-center backdrop-blur-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <XCircle className="h-6 w-6 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-200">Something went wrong</p>
        <p className="mt-1 text-xs text-zinc-500">
          {message ?? "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
