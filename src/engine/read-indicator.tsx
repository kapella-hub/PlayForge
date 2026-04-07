"use client";

import { Group, Circle, Text } from "react-konva";

interface ReadIndicatorProps {
  x: number;
  y: number;
  readNumber: number;
  state: "active" | "past" | "future";
}

/**
 * QB read progression indicator.
 * Shows a circled number near a receiver's position.
 * Active = bright gold with glow, Past = faded, Future = dim gray.
 */
export default function ReadIndicator({
  x,
  y,
  readNumber,
  state,
}: ReadIndicatorProps) {
  const radius = 10;
  const offset = -22; // position above the player

  const colors = {
    active: {
      fill: "#f59e0b",
      stroke: "#fbbf24",
      text: "#000",
      opacity: 1,
      glowColor: "#fbbf24",
      glowRadius: 12,
    },
    past: {
      fill: "rgba(245,158,11,0.3)",
      stroke: "rgba(251,191,36,0.3)",
      text: "rgba(0,0,0,0.5)",
      opacity: 0.5,
      glowColor: "transparent",
      glowRadius: 0,
    },
    future: {
      fill: "rgba(113,113,122,0.5)",
      stroke: "rgba(161,161,170,0.3)",
      text: "rgba(255,255,255,0.5)",
      opacity: 0.6,
      glowColor: "transparent",
      glowRadius: 0,
    },
  };

  const c = colors[state];

  return (
    <Group x={x} y={y + offset} listening={false}>
      {/* Glow ring for active read */}
      {state === "active" && (
        <Circle
          radius={radius + 4}
          fill="transparent"
          stroke={c.glowColor}
          strokeWidth={3}
          opacity={0.5}
        />
      )}

      {/* Circle background */}
      <Circle
        radius={radius}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.5}
        opacity={c.opacity}
        shadowColor={c.glowColor}
        shadowBlur={c.glowRadius}
      />

      {/* Number */}
      <Text
        text={String(readNumber)}
        fontSize={11}
        fontStyle="bold"
        fontFamily="Arial, sans-serif"
        fill={c.text}
        align="center"
        verticalAlign="middle"
        width={radius * 2}
        height={radius * 2}
        offsetX={radius}
        offsetY={radius}
      />
    </Group>
  );
}
