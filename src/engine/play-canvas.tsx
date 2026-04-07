"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Line, Circle, Group } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import FieldRenderer from "./field-renderer";
import PlayerNode from "./player-node";
import RouteLine from "./route-line";
import { FIELD, detectRouteType } from "./constants";
import type { AnimationState } from "./animation-engine";
import Ball from "./ball";
import ReadIndicator from "./read-indicator";
import { getReadOrder } from "./animation-engine";
import type { CanvasData, CanvasPlayer, Route, MotionPath } from "./types";
import MotionArrow from "./motion-arrow";

interface PlayCanvasProps {
  canvasData: CanvasData;
  onChange: (data: CanvasData) => void;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  drawingRoute: boolean;
  readOnly?: boolean;
  /** When provided, canvas enters animation playback mode */
  animationState?: AnimationState | null;
  /** When true, clicking a player then a field position creates a motion path */
  motionMode?: boolean;
  /** The player currently selected for motion (managed externally) */
  motionPlayerId?: string | null;
  /** Callback when motion mode interaction occurs */
  onMotionPlayerSelect?: (id: string | null) => void;
  /** When set, only this player and their route are rendered at full brightness */
  highlightPlayerId?: string;
}

export function PlayCanvas({
  canvasData,
  onChange,
  selectedPlayerId,
  onSelectPlayer,
  drawingRoute,
  readOnly = false,
  animationState = null,
  motionMode = false,
  motionPlayerId = null,
  onMotionPlayerSelect,
  highlightPlayerId,
}: PlayCanvasProps) {
  const isAnimating = !!animationState;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 480 });

  // Track previous positions for ghost trail during animation
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Update previous positions when animation state changes
  useEffect(() => {
    if (animationState) {
      // We capture the current positions BEFORE updating, to use as ghost
      const current = prevPositionsRef.current;
      const newPrev = new Map<string, { x: number; y: number }>();
      for (const [id, pos] of animationState.playerPositions) {
        const prev = current.get(id);
        if (prev) {
          newPrev.set(id, prev);
        } else {
          newPrev.set(id, pos);
        }
      }
      // Schedule update for next render
      requestAnimationFrame(() => {
        prevPositionsRef.current = new Map(animationState.playerPositions);
      });
    }
  }, [animationState]);

  // Compute read order for read indicators
  const readOrder = isAnimating ? getReadOrder(canvasData) : [];

  /** The player we are actively drawing a route for (null when not mid-draw) */
  const [drawingPlayerId, setDrawingPlayerId] = useState<string | null>(null);
  /** Live mouse position in FIELD coords for the preview line */
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Measure container and listen for resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const { width } = container.getBoundingClientRect();
      const height = (width * FIELD.HEIGHT) / FIELD.WIDTH;
      setDimensions({ width, height });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Reset drawing state when drawingRoute mode is turned off
  useEffect(() => {
    if (!drawingRoute) {
      setDrawingPlayerId(null);
      setCursorPos(null);
    }
  }, [drawingRoute]);

  const scaleX = dimensions.width / FIELD.WIDTH;
  const scaleY = dimensions.height / FIELD.HEIGHT;

  /** Convert pointer position from screen to FIELD coordinates */
  const pointerToField = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return null;
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      return { x: pointer.x / scaleX, y: pointer.y / scaleY };
    },
    [scaleX, scaleY],
  );

  const handlePlayerDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      const canvasX = x / scaleX;
      const canvasY = y / scaleY;

      const updatedPlayers = canvasData.players.map((p) =>
        p.id === id ? { ...p, x: canvasX, y: canvasY } : p,
      );
      onChange({ ...canvasData, players: updatedPlayers });
    },
    [canvasData, onChange, readOnly, scaleX, scaleY],
  );

  const handleSelectPlayer = useCallback(
    (id: string) => {
      if (motionMode) {
        // In motion mode, clicking a player selects them as motion man
        onMotionPlayerSelect?.(id);
        onSelectPlayer(id);
        return;
      }

      if (drawingRoute) {
        // In drawing mode, clicking a player starts a route from that player
        if (!drawingPlayerId) {
          // Start drawing from this player
          setDrawingPlayerId(id);
          onSelectPlayer(id);

          // If no route exists for this player yet, create one with the player
          // position as the first waypoint (the next field click will add waypoints)
          const existingRoute = canvasData.routes.find(
            (r) => r.playerId === id,
          );
          if (!existingRoute) {
            const player = canvasData.players.find((p) => p.id === id);
            if (player) {
              const newRoute: Route = {
                playerId: id,
                waypoints: [{ x: player.x, y: player.y }],
                type: "solid",
              };
              onChange({ ...canvasData, routes: [...canvasData.routes, newRoute] });
            }
          }
          return;
        }
        // If already drawing, clicking a different player finishes the current
        // route and starts a new one
        if (drawingPlayerId !== id) {
          finishCurrentRoute();
          setDrawingPlayerId(id);
          onSelectPlayer(id);

          const existingRoute = canvasData.routes.find(
            (r) => r.playerId === id,
          );
          if (!existingRoute) {
            const player = canvasData.players.find((p) => p.id === id);
            if (player) {
              const newRoute: Route = {
                playerId: id,
                waypoints: [{ x: player.x, y: player.y }],
                type: "solid",
              };
              onChange({ ...canvasData, routes: [...canvasData.routes, newRoute] });
            }
          }
          return;
        }
        // Clicking the same player while drawing = finish the route
        finishCurrentRoute();
        return;
      }

      // Normal (non-drawing) mode
      onSelectPlayer(id);
    },
    [drawingRoute, drawingPlayerId, canvasData, onChange, onSelectPlayer, motionMode, onMotionPlayerSelect],
  );

  /** Finish the current route being drawn — detect route type and clear state */
  const finishCurrentRoute = useCallback(() => {
    if (!drawingPlayerId) return;

    // Auto-detect route type from shape
    const route = canvasData.routes.find(
      (r) => r.playerId === drawingPlayerId,
    );
    if (route && route.waypoints.length >= 2) {
      const detectedType = detectRouteType(route.waypoints);
      onChange({
        ...canvasData,
        routes: canvasData.routes.map((r) =>
          r.playerId === drawingPlayerId
            ? { ...r, routeType: detectedType }
            : r,
        ),
      });
    }

    setDrawingPlayerId(null);
    setCursorPos(null);
  }, [drawingPlayerId, canvasData, onChange]);

  /** Handle keyboard events for finishing routes and undo */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        if (drawingPlayerId) {
          finishCurrentRoute();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingPlayerId, finishCurrentRoute]);

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Only handle clicks on the stage/field itself (empty area)
      if (e.target !== e.currentTarget) return;

      // Motion mode: clicking the field sets the destination for the motion player
      if (motionMode && motionPlayerId) {
        const pos = pointerToField(e);
        if (!pos) return;

        const player = canvasData.players.find((p) => p.id === motionPlayerId);
        if (!player) return;

        // Create motion path from current position to new position
        const motion: MotionPath = {
          playerId: motionPlayerId,
          fromX: player.x,
          fromY: player.y,
          toX: pos.x,
          toY: pos.y,
        };

        // Move the player to the new position and add the motion path
        const updatedPlayers = canvasData.players.map((p) =>
          p.id === motionPlayerId ? { ...p, x: pos.x, y: pos.y } : p,
        );

        // Remove existing motion for this player, add new one
        const updatedMotions = [
          ...(canvasData.motions ?? []).filter(
            (m) => m.playerId !== motionPlayerId,
          ),
          motion,
        ];

        onChange({
          ...canvasData,
          players: updatedPlayers,
          motions: updatedMotions,
        });

        onMotionPlayerSelect?.(null);
        return;
      }

      if (drawingRoute && drawingPlayerId) {
        // Add a waypoint to the route being drawn
        const pos = pointerToField(e);
        if (!pos) return;

        const existingRoute = canvasData.routes.find(
          (r) => r.playerId === drawingPlayerId,
        );

        if (existingRoute) {
          const updatedRoutes = canvasData.routes.map((r) =>
            r.playerId === drawingPlayerId
              ? { ...r, waypoints: [...r.waypoints, { x: pos.x, y: pos.y }] }
              : r,
          );
          onChange({ ...canvasData, routes: updatedRoutes });
        }
        return;
      }

      if (drawingRoute && !drawingPlayerId) {
        // In drawing mode but no player selected yet — clicking field does nothing
        return;
      }

      // Click on empty area while not drawing = deselect
      onSelectPlayer(null);
    },
    [
      drawingRoute,
      drawingPlayerId,
      canvasData,
      onChange,
      onSelectPlayer,
      pointerToField,
      motionMode,
      motionPlayerId,
      onMotionPlayerSelect,
    ],
  );

  /** Double-click on field finishes the current route */
  const handleStageDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (drawingPlayerId) {
        e.evt.preventDefault();
        finishCurrentRoute();
      }
    },
    [drawingPlayerId, finishCurrentRoute],
  );

  /** Right-click undoes the last waypoint */
  const handleContextMenu = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      if (!drawingPlayerId) return;

      const route = canvasData.routes.find(
        (r) => r.playerId === drawingPlayerId,
      );
      if (!route || route.waypoints.length <= 1) return;

      const updatedRoutes = canvasData.routes.map((r) =>
        r.playerId === drawingPlayerId
          ? { ...r, waypoints: r.waypoints.slice(0, -1) }
          : r,
      );
      onChange({ ...canvasData, routes: updatedRoutes });
    },
    [drawingPlayerId, canvasData, onChange],
  );

  /** Track mouse for preview line */
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!drawingPlayerId) {
        setCursorPos(null);
        return;
      }
      const pos = pointerToField(e);
      if (pos) setCursorPos(pos);
    },
    [drawingPlayerId, pointerToField],
  );

  /** Set cursor style based on drawing mode */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (motionMode) {
      container.style.cursor = motionPlayerId ? "crosshair" : "pointer";
    } else if (drawingRoute) {
      container.style.cursor = drawingPlayerId ? "crosshair" : "pointer";
    } else {
      container.style.cursor = "default";
    }
  }, [drawingRoute, drawingPlayerId, motionMode, motionPlayerId]);

  // Compute the preview line from last waypoint to cursor
  const previewLine = (() => {
    if (!drawingPlayerId || !cursorPos) return null;
    const route = canvasData.routes.find(
      (r) => r.playerId === drawingPlayerId,
    );
    if (!route || route.waypoints.length === 0) return null;
    const lastWp = route.waypoints[route.waypoints.length - 1];
    return { from: lastWp, to: cursorPos };
  })();

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-lg">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDblClick={handleStageDblClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
      >
        {/* Layer 1: Field background */}
        <Layer listening={false}>
          <FieldRenderer
            width={dimensions.width}
            height={dimensions.height}
          />
        </Layer>

        {/* Layer 2: Interactive layer (routes + players + preview) */}
        <Layer scaleX={scaleX} scaleY={scaleY}>
          {/* Motion arrows (pre-snap motion) */}
          {(canvasData.motions ?? []).map((motion) => (
            <MotionArrow
              key={`motion-${motion.playerId}`}
              motion={motion}
              opacity={
                highlightPlayerId
                  ? motion.playerId === highlightPlayerId
                    ? 1
                    : 0.15
                  : 1
              }
            />
          ))}

          {/* Routes rendered below players */}
          {canvasData.routes.map((route) => {
            const player = canvasData.players.find(
              (p) => p.id === route.playerId,
            );
            const routeOpacity =
              highlightPlayerId
                ? route.playerId === highlightPlayerId
                  ? 1
                  : 0.15
                : 1;
            return (
              <Group key={`route-${route.playerId}`} opacity={routeOpacity}>
                <RouteLine
                  route={route}
                  isSelected={route.playerId === selectedPlayerId}
                  side={player?.side}
                  showWaypoints={route.playerId === drawingPlayerId}
                />
              </Group>
            );
          })}

          {/* Preview line from last waypoint to cursor */}
          {previewLine && (
            <>
              <Line
                points={[
                  previewLine.from.x,
                  previewLine.from.y,
                  previewLine.to.x,
                  previewLine.to.y,
                ]}
                stroke={FIELD.COLORS.PREVIEW_LINE}
                strokeWidth={2}
                dash={[6, 4]}
                lineCap="round"
                listening={false}
              />
              <Circle
                x={previewLine.to.x}
                y={previewLine.to.y}
                radius={3}
                fill={FIELD.COLORS.WAYPOINT}
                listening={false}
              />
            </>
          )}

          {/* Players */}
          {canvasData.players.map((player: CanvasPlayer) => {
            const playerOpacity =
              highlightPlayerId
                ? player.id === highlightPlayerId
                  ? 1
                  : 0.3
                : 1;
            return (
              <Group key={player.id} opacity={playerOpacity}>
                <PlayerNode
                  player={player}
                  isSelected={player.id === selectedPlayerId}
                  onSelect={handleSelectPlayer}
                  onDragEnd={handlePlayerDragEnd}
                  animatedPosition={
                    isAnimating
                      ? animationState.playerPositions.get(player.id)
                      : undefined
                  }
                  ghostPosition={
                    isAnimating
                      ? prevPositionsRef.current.get(player.id)
                      : undefined
                  }
                />
              </Group>
            );
          })}

          {/* QB Read Progression Indicators */}
          {isAnimating &&
            readOrder.map((playerId, index) => {
              const pos = animationState.playerPositions.get(playerId);
              if (!pos) return null;
              const readNum = index + 1;
              const activeRead = animationState.activeRead ?? 0;
              let state: "active" | "past" | "future";
              if (readNum === activeRead) state = "active";
              else if (readNum < activeRead) state = "past";
              else state = "future";
              return (
                <ReadIndicator
                  key={`read-${playerId}`}
                  x={pos.x}
                  y={pos.y}
                  readNumber={readNum}
                  state={state}
                />
              );
            })}

          {/* Ball animation */}
          {isAnimating && animationState.ballPosition && (
            <Ball
              position={animationState.ballPosition}
              visible={animationState.ballPosition.visible}
              rotation={0}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
