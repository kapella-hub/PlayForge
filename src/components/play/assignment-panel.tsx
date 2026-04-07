"use client";

import type { CanvasPlayer, Route } from "@/engine/types";
import { X, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AssignmentPanelProps {
  player: CanvasPlayer | null;
  route: Route | undefined;
  onClose: () => void;
  onDeleteRoute: () => void;
  onUpdateRouteType: (type: Route["type"]) => void;
  onUpdateRouteTypeName?: (playerId: string, routeType: string) => void;
}

const routeGroups = [
  {
    label: "Short",
    routes: ["Flat", "Slant", "Drag"],
  },
  {
    label: "Medium",
    routes: ["In", "Out", "Curl", "Dig"],
  },
  {
    label: "Deep",
    routes: ["Post", "Corner", "Go", "Seam"],
  },
  {
    label: "Other",
    routes: ["Screen", "Block", "Wheel", "Comeback"],
  },
] as const;

/** Visual line style button showing actual line rendering */
function LineStyleButton({
  type,
  label,
  active,
  onClick,
}: {
  type: Route["type"];
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-all",
        active
          ? "border-indigo-500/60 bg-indigo-500/10"
          : "border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600",
      )}
    >
      <svg width="36" height="8" viewBox="0 0 36 8">
        {type === "solid" && (
          <line
            x1="2"
            y1="4"
            x2="34"
            y2="4"
            stroke={active ? "#818cf8" : "#a1a1aa"}
            strokeWidth="2"
          />
        )}
        {type === "dashed" && (
          <line
            x1="2"
            y1="4"
            x2="34"
            y2="4"
            stroke={active ? "#818cf8" : "#a1a1aa"}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        )}
        {type === "thick" && (
          <line
            x1="2"
            y1="4"
            x2="34"
            y2="4"
            stroke={active ? "#818cf8" : "#a1a1aa"}
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span
        className={cn(
          "text-[10px] font-medium",
          active ? "text-indigo-300" : "text-zinc-500",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function AssignmentPanel({
  player,
  route,
  onClose,
  onDeleteRoute,
  onUpdateRouteType,
  onUpdateRouteTypeName,
}: AssignmentPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {player && (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-zinc-900/90 p-4 shadow-2xl backdrop-blur-xl"
        >
          {/* ── Player identity ── */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Colored player circle */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg",
                  player.side === "offense"
                    ? "bg-blue-600 shadow-blue-500/25"
                    : "bg-red-600 shadow-red-500/25",
                )}
              >
                {player.label}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {player.label}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span>{player.id}</span>
                  <span className="text-zinc-700">&middot;</span>
                  <span
                    className={
                      player.side === "offense"
                        ? "text-blue-400"
                        : "text-red-400"
                    }
                  >
                    {player.side}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {route ? (
            <>
              {/* ── Line style ── */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Line Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <LineStyleButton
                    type="solid"
                    label="Route"
                    active={route.type === "solid"}
                    onClick={() => onUpdateRouteType("solid")}
                  />
                  <LineStyleButton
                    type="dashed"
                    label="Motion"
                    active={route.type === "dashed"}
                    onClick={() => onUpdateRouteType("dashed")}
                  />
                  <LineStyleButton
                    type="thick"
                    label="Block"
                    active={route.type === "thick"}
                    onClick={() => onUpdateRouteType("thick")}
                  />
                </div>
              </div>

              {/* ── Route type pills ── */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Route Type
                </label>
                <div className="space-y-2">
                  {routeGroups.map((group) => (
                    <div key={group.label}>
                      <span className="mb-1 block text-[10px] text-zinc-600">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {group.routes.map((rt) => {
                          const isActive =
                            route.routeType === rt.toLowerCase();
                          return (
                            <button
                              key={rt}
                              onClick={() => onUpdateRouteTypeName?.(player.id, rt.toLowerCase())}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                                isActive
                                  ? "bg-indigo-600 text-white"
                                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
                              )}
                            >
                              {rt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waypoints info */}
              <div className="rounded-lg bg-zinc-800/50 px-3 py-2 text-xs text-zinc-500">
                {route.waypoints.length} waypoint
                {route.waypoints.length !== 1 ? "s" : ""} drawn
              </div>

              {/* ── Quick actions ── */}
              <div className="flex gap-2">
                <button
                  onClick={onDeleteRoute}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Route
                </button>
                <button
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
                  title="Mirror to opposite side"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Mirror
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center">
              <p className="text-xs text-zinc-500">
                Press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">D</kbd>{" "}
                to enter drawing mode, then click on the field to draw a route.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
