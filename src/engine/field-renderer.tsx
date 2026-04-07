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

  const playableW = W - PADDING * 2;

  // Yard lines centered on LOS
  const yardLineCount = 9;
  const yardLines: { y: number; number: number }[] = [];
  for (let i = -yardLineCount; i <= yardLineCount; i++) {
    const y = LINE_OF_SCRIMMAGE_Y + i * YARD_LINE_SPACING;
    if (y < 0 || y > H) continue;
    const yardNumber = 50 - Math.abs(i) * 5;
    if (yardNumber >= 10 && yardNumber <= 50) {
      yardLines.push({ y, number: yardNumber });
    }
  }

  // Hash mark positions
  const hashLeft = W * FIELD.HASH_LEFT_RATIO;
  const hashRight = W * FIELD.HASH_RIGHT_RATIO;
  const hashLength = 6;

  // Grass mowing stripes (alternating light/dark bands every ~20 px)
  const stripeHeight = 20;
  const stripeCount = Math.ceil(H / stripeHeight);

  // Yard numbers to render (10, 20, 30, 40, 50)
  const numberedYards = yardLines.filter(
    (yl) => yl.number % 10 === 0 && yl.number >= 10,
  );

  return (
    <Group scaleX={scaleX} scaleY={scaleY}>
      {/* Base field gradient — dark green at edges, lighter center */}
      <Rect
        x={0}
        y={0}
        width={W}
        height={H}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: H }}
        fillLinearGradientColorStops={[
          0, COLORS.FIELD_DARK,
          0.3, COLORS.FIELD,
          0.5, COLORS.FIELD_LIGHT,
          0.7, COLORS.FIELD,
          1, COLORS.FIELD_DARK,
        ]}
      />

      {/* Grass mowing stripe effect */}
      {Array.from({ length: stripeCount }, (_, i) => (
        i % 2 === 0 ? (
          <Rect
            key={`stripe-${i}`}
            x={PADDING}
            y={i * stripeHeight}
            width={playableW}
            height={stripeHeight}
            fill="rgba(255,255,255,0.018)"
          />
        ) : null
      ))}

      {/* End zone at top */}
      <Rect
        x={PADDING}
        y={0}
        width={playableW}
        height={PADDING}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: PADDING }}
        fillLinearGradientColorStops={[
          0, COLORS.ENDZONE_ACCENT,
          1, COLORS.ENDZONE,
        ]}
      />

      {/* End zone text */}
      <Text
        x={PADDING}
        y={8}
        width={playableW}
        text="P L A Y F O R G E"
        fontSize={22}
        fontFamily="Arial, sans-serif"
        fontStyle="bold"
        fill={COLORS.ENDZONE_TEXT}
        align="center"
        letterSpacing={6}
      />

      {/* End zone at bottom */}
      <Rect
        x={PADDING}
        y={H - PADDING}
        width={playableW}
        height={PADDING}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: PADDING }}
        fillLinearGradientColorStops={[
          0, COLORS.ENDZONE,
          1, COLORS.ENDZONE_ACCENT,
        ]}
      />

      {/* Bottom end zone text (upside-down via scaleY) */}
      <Text
        x={PADDING}
        y={H - PADDING + 8}
        width={playableW}
        text="P L A Y F O R G E"
        fontSize={22}
        fontFamily="Arial, sans-serif"
        fontStyle="bold"
        fill={COLORS.ENDZONE_TEXT}
        align="center"
        letterSpacing={6}
      />

      {/* Left sideline */}
      <Line
        points={[PADDING, 0, PADDING, H]}
        stroke={COLORS.LINES}
        strokeWidth={3}
        opacity={0.9}
      />

      {/* Right sideline */}
      <Line
        points={[W - PADDING, 0, W - PADDING, H]}
        stroke={COLORS.LINES}
        strokeWidth={3}
        opacity={0.9}
      />

      {/* Top goal line */}
      <Line
        points={[PADDING, PADDING, W - PADDING, PADDING]}
        stroke={COLORS.LINES}
        strokeWidth={2.5}
        opacity={0.9}
      />

      {/* Bottom goal line */}
      <Line
        points={[PADDING, H - PADDING, W - PADDING, H - PADDING]}
        stroke={COLORS.LINES}
        strokeWidth={2.5}
        opacity={0.9}
      />

      {/* Yard lines, hash marks, and minor tick marks */}
      {yardLines.map(({ y, number }) => {
        const isMajor = number % 10 === 0;
        return (
          <Group key={`yard-${y}`}>
            {/* Yard line */}
            <Line
              points={[PADDING, y, W - PADDING, y]}
              stroke={COLORS.LINES}
              strokeWidth={isMajor ? 1 : 0.5}
              opacity={isMajor ? 0.5 : 0.3}
            />

            {/* Left hash mark */}
            <Line
              points={[
                hashLeft,
                y - hashLength,
                hashLeft,
                y + hashLength,
              ]}
              stroke={COLORS.LINES}
              strokeWidth={1}
              opacity={0.55}
            />

            {/* Right hash mark */}
            <Line
              points={[
                hashRight,
                y - hashLength,
                hashRight,
                y + hashLength,
              ]}
              stroke={COLORS.LINES}
              strokeWidth={1}
              opacity={0.55}
            />

            {/* Small tick marks along sidelines every 5 yards */}
            <Line
              points={[PADDING, y, PADDING + 12, y]}
              stroke={COLORS.LINES}
              strokeWidth={0.8}
              opacity={0.4}
            />
            <Line
              points={[W - PADDING - 12, y, W - PADDING, y]}
              stroke={COLORS.LINES}
              strokeWidth={0.8}
              opacity={0.4}
            />
          </Group>
        );
      })}

      {/* Large yard numbers */}
      {numberedYards.map(({ y, number }) => {
        const isTopHalf = y < LINE_OF_SCRIMMAGE_Y;
        // Numbers on top half face upward (normal), bottom half face downward
        // Using rotation for the bottom half numbers
        return (
          <Group key={`num-${y}`}>
            {/* Left number */}
            <Text
              x={PADDING + 20}
              y={isTopHalf ? y - 12 : y - 12}
              text={String(number)}
              fontSize={24}
              fontFamily="Arial, sans-serif"
              fontStyle="bold"
              fill={COLORS.LINES}
              opacity={0.12}
              rotation={isTopHalf ? 0 : 180}
              offsetX={isTopHalf ? 0 : 20}
              offsetY={isTopHalf ? 0 : 12}
            />

            {/* Right number */}
            <Text
              x={W - PADDING - 45}
              y={isTopHalf ? y - 12 : y - 12}
              text={String(number)}
              fontSize={24}
              fontFamily="Arial, sans-serif"
              fontStyle="bold"
              fill={COLORS.LINES}
              opacity={0.12}
              rotation={isTopHalf ? 0 : 180}
              offsetX={isTopHalf ? 0 : 20}
              offsetY={isTopHalf ? 0 : 12}
            />
          </Group>
        );
      })}

      {/* Line of scrimmage — glowing yellow line */}
      {/* Glow layer (wider, transparent) */}
      <Line
        points={[PADDING, LINE_OF_SCRIMMAGE_Y, W - PADDING, LINE_OF_SCRIMMAGE_Y]}
        stroke={COLORS.LOS_GLOW}
        strokeWidth={8}
        opacity={0.6}
      />
      {/* Main LOS line */}
      <Line
        points={[PADDING, LINE_OF_SCRIMMAGE_Y, W - PADDING, LINE_OF_SCRIMMAGE_Y]}
        stroke={COLORS.LOS}
        strokeWidth={2.5}
        opacity={0.9}
      />

      {/* Vignette — darkened edges */}
      {/* Left vignette */}
      <Rect
        x={0}
        y={0}
        width={PADDING}
        height={H}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: PADDING, y: 0 }}
        fillLinearGradientColorStops={[
          0, "rgba(0,0,0,0.3)",
          1, "rgba(0,0,0,0)",
        ]}
      />
      {/* Right vignette */}
      <Rect
        x={W - PADDING}
        y={0}
        width={PADDING}
        height={H}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: PADDING, y: 0 }}
        fillLinearGradientColorStops={[
          0, "rgba(0,0,0,0)",
          1, "rgba(0,0,0,0.3)",
        ]}
      />
      {/* Top vignette */}
      <Rect
        x={0}
        y={0}
        width={W}
        height={40}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 40 }}
        fillLinearGradientColorStops={[
          0, "rgba(0,0,0,0.2)",
          1, "rgba(0,0,0,0)",
        ]}
      />
      {/* Bottom vignette */}
      <Rect
        x={0}
        y={H - 40}
        width={W}
        height={40}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: 40 }}
        fillLinearGradientColorStops={[
          0, "rgba(0,0,0,0)",
          1, "rgba(0,0,0,0.2)",
        ]}
      />
    </Group>
  );
}
