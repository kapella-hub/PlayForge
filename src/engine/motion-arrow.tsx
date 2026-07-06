"use client";

import { Group, Arrow, Circle } from "react-konva";
import { FIELD } from "./constants";
import type { MotionPath } from "./types";

interface MotionArrowProps {
  motion: MotionPath;
  opacity?: number;
}

const MOTION_COLOR = FIELD.COLORS.MOTION; // bright cyan/teal

export default function MotionArrow({ motion, opacity = 1 }: MotionArrowProps) {
  const points = [motion.fromX, motion.fromY, motion.toX, motion.toY];

  return (
    <Group opacity={opacity}>
      {/* Start position circle */}
      <Circle
        x={motion.fromX}
        y={motion.fromY}
        radius={5}
        fill={MOTION_COLOR}
        opacity={0.6}
        listening={false}
      />

      {/* Dashed motion arrow */}
      <Arrow
        points={points}
        stroke={MOTION_COLOR}
        strokeWidth={2.5}
        fill={MOTION_COLOR}
        dash={[8, 6]}
        pointerLength={10}
        pointerWidth={8}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    </Group>
  );
}
