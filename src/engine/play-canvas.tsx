"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Line, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import FieldRenderer from "./field-renderer";
import PlayerNode from "./player-node";
import RouteLine from "./route-line";
import { FIELD, detectRouteType } from "./constants";
import type { CanvasData, CanvasPlayer, Route } from "./types";

interface PlayCanvasProps {
  canvasData: CanvasData;
  onChange: (data: CanvasData) => void;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  drawingRoute: boolean;
  readOnly?: boolean;
}

export function PlayCanvas({
  canvasData,
  onChange,
  selectedPlayerId,
  onSelectPlayer,
  drawingRoute,
  readOnly = false,
}: PlayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 480 });

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
    [drawingRoute, drawingPlayerId, canvasData, onChange, onSelectPlayer],
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
    if (drawingRoute) {
      container.style.cursor = drawingPlayerId ? "crosshair" : "pointer";
    } else {
      container.style.cursor = "default";
    }
  }, [drawingRoute, drawingPlayerId]);

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
          {/* Routes rendered below players */}
          {canvasData.routes.map((route) => {
            const player = canvasData.players.find(
              (p) => p.id === route.playerId,
            );
            return (
              <RouteLine
                key={`route-${route.playerId}`}
                route={route}
                isSelected={route.playerId === selectedPlayerId}
                side={player?.side}
                showWaypoints={route.playerId === drawingPlayerId}
              />
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
          {canvasData.players.map((player: CanvasPlayer) => (
            <PlayerNode
              key={player.id}
              player={player}
              isSelected={player.id === selectedPlayerId}
              onSelect={handleSelectPlayer}
              onDragEnd={handlePlayerDragEnd}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
