"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RotateCcw, X, Loader2 } from "lucide-react";
import { getPlayVersions, restorePlayVersion } from "@/lib/actions/play-actions";

interface PlayVersion {
  id: string;
  version: number;
  canvasData: unknown;
  animationData: unknown;
  notes: string | null;
  createdAt: Date;
  createdBy: { name: string | null; email: string };
}

interface VersionHistoryProps {
  playId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (canvasData: unknown) => void;
}

export function VersionHistory({
  playId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<PlayVersion[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [restoring, startRestore] = useTransition();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const loading = isOpen && !!playId && loadedKey !== playId;

  useEffect(() => {
    if (!isOpen || !playId || loadedKey === playId) return;
    let active = true;
    getPlayVersions(playId)
      .then((v) => {
        if (!active) return;
        setVersions(v as PlayVersion[]);
        setLoadedKey(playId);
      })
      .catch(() => {
        // Preserve the original's degrade-to-empty-state behavior: mark loaded so
        // `loading` clears instead of spinning forever on a failed fetch.
        if (active) setLoadedKey(playId);
      });
    return () => {
      active = false;
    };
  }, [isOpen, playId, loadedKey]);

  const handleRestore = (version: PlayVersion) => {
    startRestore(async () => {
      await restorePlayVersion(playId, version.id);
      onRestore(version.canvasData);
      onClose();
    });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-4 right-4 top-20 z-30 flex w-72 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4" />
              Version History
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground/85"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Version list */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No versions yet. Save changes to create versions.
              </div>
            ) : (
              <div className="space-y-1">
                {versions.map((version, idx) => (
                  <div
                    key={version.id}
                    onClick={() =>
                      setPreviewId(
                        previewId === version.id ? null : version.id,
                      )
                    }
                    className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
                      previewId === version.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-transparent hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        Version {version.version}
                        {idx === 0 && (
                          <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary-emphasis">
                            Latest
                          </span>
                        )}
                      </span>
                      {previewId === version.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(version);
                          }}
                          disabled={restoring}
                          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {restoring ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Restore
                        </button>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {formatDate(version.createdAt)} by{" "}
                      {version.createdBy.name ?? version.createdBy.email}
                    </div>
                    {version.notes && (
                      <div className="mt-1 text-[10px] text-muted-foreground italic">
                        {version.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
