"use client";

import { Group, Line, Arrow, Circle } from "react-konva";
import { FIELD } from "./constants";
import type { Route } from "./types";

interface RouteLineProps {
  route: Route;
  isSelected: boolean;
  /** Optional: side of the player this route belongs to, for color coding */
  side?: "offense" | "defense";
  /** Optional: show waypoint dots for editing feedback */
  showWaypoints?: boolean;
}

export default function RouteLine({
  route,
  isSelected,
  side = "offense",
  showWaypoints = false,
}: RouteLineProps) {
  if (route.waypoints.length < 2) return null;

  // Color coding based on route type and player side
  const baseColor =
    route.type === "dashed"
      ? FIELD.COLORS.ROUTE_DASHED
      : route.type === "thick"
        ? FIELD.COLORS.ROUTE_BLOCK
        : side === "offense"
          ? FIELD.COLORS.ROUTE_OFFENSE
          : FIELD.COLORS.ROUTE_DEFENSE;

  const glowColor =
    side === "offense"
      ? FIELD.COLORS.ROUTE_GLOW
      : "rgba(252,165,165,0.3)";

  const isDashed = route.type === "dashed";
  const isThick = route.type === "thick";
  const strokeWidth = isThick ? 4 : isSelected ? 3.5 : 2.5;
  const glowWidth = strokeWidth + (isSelected ? 8 : 4);

  // Flatten all waypoints to a flat point array
  const allPoints = route.waypoints.flatMap((wp) => [wp.x, wp.y]);

  // Arrow properties — larger, filled triangles
  const pointerLength = isSelected ? 12 : 10;
  const pointerWidth = isSelected ? 10 : 8;

  const tension = 0.4; // smoother curves

  // Simple 2-waypoint route
  if (route.waypoints.length === 2) {
    return (
      <Group>
        {/* Glow layer */}
        <Arrow
          points={allPoints}
          stroke={glowColor}
          strokeWidth={glowWidth}
          fill="transparent"
          pointerLength={0}
          pointerWidth={0}
          lineCap="round"
          lineJoin="round"
          tension={tension}
          listening={false}
        />
        {/* Main arrow */}
        <Arrow
          points={allPoints}
          stroke={isSelected ? "#ffffff" : baseColor}
          strokeWidth={strokeWidth}
          fill={isSelected ? "#ffffff" : baseColor}
          dash={isDashed ? [10, 8] : undefined}
          pointerLength={pointerLength}
          pointerWidth={pointerWidth}
          lineCap="round"
          lineJoin="round"
          tension={tension}
        />
        {/* Waypoint dots */}
        {showWaypoints &&
          route.waypoints.map((wp, i) => (
            <Circle
              key={`wp-${i}`}
              x={wp.x}
              y={wp.y}
              radius={3}
              fill={FIELD.COLORS.WAYPOINT}
              listening={false}
            />
          ))}
      </Group>
    );
  }

  // Multi-waypoint: Line for main path, Arrow for last segment
  const mainPoints = allPoints.slice(0, -2);
  const lastSegment = allPoints.slice(-4);

  return (
    <Group>
      {/* Glow layer — main path */}
      <Line
        points={mainPoints}
        stroke={glowColor}
        strokeWidth={glowWidth}
        lineCap="round"
        lineJoin="round"
        tension={tension}
        listening={false}
      />
      {/* Glow layer — last segment */}
      <Line
        points={lastSegment}
        stroke={glowColor}
        strokeWidth={glowWidth}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />

      {/* Main path */}
      <Line
        points={mainPoints}
        stroke={isSelected ? "#ffffff" : baseColor}
        strokeWidth={strokeWidth}
        dash={isDashed ? [10, 8] : undefined}
        lineCap="round"
        lineJoin="round"
        tension={tension}
      />
      {/* Last segment with arrow */}
      <Arrow
        points={lastSegment}
        stroke={isSelected ? "#ffffff" : baseColor}
        strokeWidth={strokeWidth}
        fill={isSelected ? "#ffffff" : baseColor}
        dash={isDashed ? [10, 8] : undefined}
        pointerLength={pointerLength}
        pointerWidth={pointerWidth}
        lineCap="round"
        lineJoin="round"
      />

      {/* Waypoint dots for editing feedback */}
      {showWaypoints &&
        route.waypoints.map((wp, i) => (
          <Circle
            key={`wp-${i}`}
            x={wp.x}
            y={wp.y}
            radius={3}
            fill={FIELD.COLORS.WAYPOINT}
            listening={false}
          />
        ))}
    </Group>
  );
}
