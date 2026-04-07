"use client";

import { Group, Line, Arrow } from "react-konva";
import { FIELD } from "./constants";
import type { Route } from "./types";

interface RouteLineProps {
  route: Route;
  isSelected: boolean;
}

export default function RouteLine({ route, isSelected }: RouteLineProps) {
  if (route.waypoints.length < 2) return null;

  const colorMap: Record<Route["type"], string> = {
    solid: FIELD.COLORS.ROUTE,
    dashed: FIELD.COLORS.ROUTE_DASHED,
    thick: FIELD.COLORS.ROUTE_BLOCK,
  };

  const color = colorMap[route.type];
  const isDashed = route.type === "dashed";
  const isThick = route.type === "thick";
  const strokeWidth = isThick ? 4 : isSelected ? 3 : 2;

  // Flatten all waypoints to a flat point array
  const allPoints = route.waypoints.flatMap((wp) => [wp.x, wp.y]);

  // If only 2 waypoints, just use an Arrow for the whole segment
  if (route.waypoints.length === 2) {
    return (
      <Group>
        <Arrow
          points={allPoints}
          stroke={color}
          strokeWidth={strokeWidth}
          fill={color}
          dash={isDashed ? [8, 6] : undefined}
          pointerLength={8}
          pointerWidth={8}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
        />
      </Group>
    );
  }

  // Multiple waypoints: Line for main path, Arrow for last segment
  const mainPoints = allPoints.slice(0, -2); // all except last point
  const lastSegment = allPoints.slice(-4); // last two points (4 values)

  return (
    <Group>
      <Line
        points={mainPoints}
        stroke={color}
        strokeWidth={strokeWidth}
        dash={isDashed ? [8, 6] : undefined}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
      />
      <Arrow
        points={lastSegment}
        stroke={color}
        strokeWidth={strokeWidth}
        fill={color}
        dash={isDashed ? [8, 6] : undefined}
        pointerLength={8}
        pointerWidth={8}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );
}
