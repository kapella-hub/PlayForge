"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import FieldRenderer from "./field-renderer";
import PlayerNode from "./player-node";
import RouteLine from "./route-line";
import { FIELD } from "./constants";
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

  // Measure container and listen for resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const { width } = container.getBoundingClientRect();
      // Maintain the FIELD aspect ratio
      const height = (width * FIELD.HEIGHT) / FIELD.WIDTH;
      setDimensions({ width, height });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scaleX = dimensions.width / FIELD.WIDTH;
  const scaleY = dimensions.height / FIELD.HEIGHT;

  const handlePlayerDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      // The coordinates from PlayerNode are already in the scaled layer space,
      // so convert back to FIELD (canvas) space.
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
      onSelectPlayer(id);
    },
    [onSelectPlayer],
  );

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Only handle clicks on the stage itself (empty area)
      if (e.target !== e.currentTarget) return;

      if (drawingRoute && selectedPlayerId) {
        // Get click position in FIELD coordinate space
        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const clickX = pointer.x / scaleX;
        const clickY = pointer.y / scaleY;

        const existingRoute = canvasData.routes.find(
          (r) => r.playerId === selectedPlayerId,
        );

        let updatedRoutes: Route[];

        if (existingRoute) {
          // Append waypoint to existing route
          updatedRoutes = canvasData.routes.map((r) =>
            r.playerId === selectedPlayerId
              ? { ...r, waypoints: [...r.waypoints, { x: clickX, y: clickY }] }
              : r,
          );
        } else {
          // Start a new route from the player position
          const player = canvasData.players.find(
            (p) => p.id === selectedPlayerId,
          );
          if (!player) return;

          const newRoute: Route = {
            playerId: selectedPlayerId,
            waypoints: [
              { x: player.x, y: player.y },
              { x: clickX, y: clickY },
            ],
            type: "solid",
          };
          updatedRoutes = [...canvasData.routes, newRoute];
        }

        onChange({ ...canvasData, routes: updatedRoutes });
      } else {
        // Click on empty area while not drawing = deselect
        onSelectPlayer(null);
      }
    },
    [
      drawingRoute,
      selectedPlayerId,
      canvasData,
      onChange,
      onSelectPlayer,
      scaleX,
      scaleY,
    ],
  );

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-lg">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Layer 1: Field background */}
        <Layer listening={false}>
          <FieldRenderer
            width={dimensions.width}
            height={dimensions.height}
          />
        </Layer>

        {/* Layer 2: Interactive layer (routes + players) */}
        <Layer scaleX={scaleX} scaleY={scaleY}>
          {/* Routes rendered below players */}
          {canvasData.routes.map((route) => (
            <RouteLine
              key={`route-${route.playerId}`}
              route={route}
              isSelected={route.playerId === selectedPlayerId}
            />
          ))}

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
