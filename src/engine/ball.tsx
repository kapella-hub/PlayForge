"use client";

import { Group, Ellipse, Circle } from "react-konva";

interface BallProps {
  position: { x: number; y: number };
  visible: boolean;
  rotation: number;
}

/**
 * Animated football component.
 * Renders a brown oval with a shadow underneath.
 */
export default function Ball({ position, visible, rotation }: BallProps) {
  if (!visible) return null;

  // Shadow scale simulates height: ball arc makes shadow shrink in the middle
  const shadowScale = 0.7;

  return (
    <Group x={position.x} y={position.y} listening={false}>
      {/* Shadow underneath */}
      <Ellipse
        radiusX={6 * shadowScale}
        radiusY={3 * shadowScale}
        fill="rgba(0,0,0,0.3)"
        offsetY={-8}
      />

      {/* Football body */}
      <Ellipse
        radiusX={8}
        radiusY={5}
        fill="#8B4513"
        stroke="#5C2D0A"
        strokeWidth={1}
        rotation={rotation}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={6}
        shadowOffsetY={2}
      />

      {/* Football laces (white stripe) */}
      <Ellipse
        radiusX={5}
        radiusY={1}
        fill="white"
        rotation={rotation}
        opacity={0.8}
      />
    </Group>
  );
}
