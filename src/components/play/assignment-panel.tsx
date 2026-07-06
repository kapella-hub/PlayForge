"use client";

import type { CanvasPlayer, Route } from "@/engine/types";
import { X, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ROUTE_TYPE_GROUPS, normalizeRouteType } from "@/engine/route-types";

interface AssignmentPanelProps {
  player: CanvasPlayer | null;
  route: Route | undefined;
  onClose: () => void;
  onDeleteRoute: () => void;
  onUpdateRouteType: (type: Route["type"]) => void;
  onUpdateRouteTypeName?: (playerId: string, routeType: string) => void;
  onMirror?: () => void;
}

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
          ? "border-primary/60 bg-primary/10"
          : "border-border/50 bg-secondary hover:border-border",
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
          active ? "text-primary-emphasis" : "text-muted-foreground",
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
  onMirror,
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
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur-xl"
        >
          {/* ── Player identity ── */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Colored player circle */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground shadow-lg",
                  player.side === "offense"
                    ? "bg-offense shadow-offense/25"
                    : "bg-defense shadow-defense/25",
                )}
              >
                {player.label}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {player.label}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{player.id}</span>
                  <span className="text-muted-foreground/60">&middot;</span>
                  <span
                    className={
                      player.side === "offense"
                        ? "text-offense"
                        : "text-defense"
                    }
                  >
                    {player.side}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-foreground/85"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {route ? (
            <>
              {/* ── Line style ── */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Route Type
                </label>
                <div className="space-y-2">
                  {ROUTE_TYPE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <span className="mb-1 block text-[10px] text-muted-foreground/70">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {group.routes.map((rt) => {
                          const isActive =
                            route.routeType !== undefined &&
                            normalizeRouteType(route.routeType) === rt;
                          return (
                            <button
                              key={rt}
                              onClick={() => onUpdateRouteTypeName?.(player.id, rt)}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
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
              <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                {route.waypoints.length} waypoint
                {route.waypoints.length !== 1 ? "s" : ""} drawn
              </div>

              {/* ── Quick actions ── */}
              <div className="flex gap-2">
                <button
                  onClick={onDeleteRoute}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Route
                </button>
                <button
                  onClick={onMirror}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80"
                  title="Mirror to opposite side"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Mirror
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">D</kbd>{" "}
                to enter drawing mode, then click on the field to draw a route.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
