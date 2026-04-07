"use client";

import { Group, Rect, Line, Text } from "react-konva";
import { FIELD } from "./constants";

interface FieldRendererProps {
  width: number;
  height: number;
}

export default function FieldRenderer({ width, height }: FieldRendererProps) {
  const scaleX = width / FIELD.WIDTH;
  const scaleY = height / FIELD.HEIGHT;

  const {
    WIDTH: W,
    HEIGHT: H,
    PADDING,
    YARD_LINE_SPACING,
    LINE_OF_SCRIMMAGE_Y,
    COLORS,
  } = FIELD;

  // Yard lines centered on LOS
  const yardLineCount = 9; // 5 yard intervals, ~45 yards each direction
  const yardLines: { y: number; number: number }[] = [];
  for (let i = -yardLineCount; i <= yardLineCount; i++) {
    const y = LINE_OF_SCRIMMAGE_Y + i * YARD_LINE_SPACING;
    if (y < 0 || y > H) continue;
    // Map yard line index to yard number (50 at LOS, decreasing outward)
    const yardNumber = 50 - Math.abs(i) * 5;
    if (yardNumber >= 10 && yardNumber <= 50) {
      yardLines.push({ y, number: yardNumber });
    }
  }

  // Hash mark positions at ~37% and ~63% of width
  const hashLeft = W * 0.37;
  const hashRight = W * 0.63;
  const hashLength = 8;

  return (
    <Group scaleX={scaleX} scaleY={scaleY}>
      {/* Green field background */}
      <Rect x={0} y={0} width={W} height={H} fill={COLORS.FIELD} />

      {/* End zone at top */}
      <Rect
        x={PADDING}
        y={0}
        width={W - PADDING * 2}
        height={PADDING}
        fill={COLORS.ENDZONE}
        opacity={0.6}
      />

      {/* Left sideline */}
      <Line
        points={[PADDING, 0, PADDING, H]}
        stroke={COLORS.LINES}
        strokeWidth={2}
      />

      {/* Right sideline */}
      <Line
        points={[W - PADDING, 0, W - PADDING, H]}
        stroke={COLORS.LINES}
        strokeWidth={2}
      />

      {/* Yard lines and numbers */}
      {yardLines.map(({ y, number }) => (
        <Group key={`yard-${y}`}>
          {/* Yard line */}
          <Line
            points={[PADDING, y, W - PADDING, y]}
            stroke={COLORS.LINES}
            strokeWidth={0.5}
            opacity={0.4}
          />

          {/* Hash marks */}
          <Line
            points={[hashLeft, y - hashLength, hashLeft, y + hashLength]}
            stroke={COLORS.LINES}
            strokeWidth={1}
            opacity={0.5}
          />
          <Line
            points={[hashRight, y - hashLength, hashRight, y + hashLength]}
            stroke={COLORS.LINES}
            strokeWidth={1}
            opacity={0.5}
          />

          {/* Yard number - left side */}
          <Text
            x={PADDING + 10}
            y={y - 8}
            text={String(number)}
            fontSize={14}
            fill={COLORS.LINES}
            opacity={0.35}
            fontStyle="bold"
          />

          {/* Yard number - right side */}
          <Text
            x={W - PADDING - 30}
            y={y - 8}
            text={String(number)}
            fontSize={14}
            fill={COLORS.LINES}
            opacity={0.35}
            fontStyle="bold"
          />
        </Group>
      ))}

      {/* Line of scrimmage (dashed, yellow) */}
      <Line
        points={[PADDING, LINE_OF_SCRIMMAGE_Y, W - PADDING, LINE_OF_SCRIMMAGE_Y]}
        stroke={COLORS.LOS}
        strokeWidth={2}
        dash={[10, 6]}
        opacity={0.8}
      />
    </Group>
  );
}
