"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { importSharedPlaybook } from "@/lib/actions/playbook-actions";
import { Download, Loader2 } from "lucide-react";

export function ImportPlaybookButton({ shareId }: { shareId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleImport() {
    startTransition(async () => {
      const playbook = await importSharedPlaybook(shareId);
      router.push(`/playbooks/${playbook.id}`);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleImport}
      disabled={isPending}
      className="gap-1.5"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Import
    </Button>
  );
}
