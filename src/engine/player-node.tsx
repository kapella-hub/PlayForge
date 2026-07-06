"use client";

import { Group, Circle, Text } from "react-konva";
import { FIELD, isOL } from "./constants";
import type { CanvasPlayer } from "./types";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";

interface PlayerNodeProps {
  player: CanvasPlayer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  /**
   * Konva-idiomatic drag constraint (designer only): called during Konva's own
   * drag positioning with the proposed ABSOLUTE (stage-pixel) position; the
   * returned position is what Konva actually paints, so overrides here (unlike
   * a dragmove handler mutating node.position()) survive.
   */
  dragBoundFunc?: (pos: Vector2d) => Vector2d;
  /** When provided, overrides player.x/y for animation playback */
  animatedPosition?: { x: number; y: number };
  /** Previous position for motion trail ghost effect */
  ghostPosition?: { x: number; y: number };
}

/** Get gradient fill colors based on side and position */
function getPlayerColors(player: CanvasPlayer, isSelected: boolean) {
  if (isSelected) {
    return {
      inner: FIELD.COLORS.SELECTED,
      outer: FIELD.COLORS.SELECTED_GLOW,
      ring: FIELD.COLORS.PLAYER_RING_SELECTED,
      ringWidth: 3,
      glowColor: FIELD.COLORS.SELECTED_GLOW,
      glowRadius: 10,
    };
  }

  if (player.side === "offense") {
    const isLineman = isOL(player.label);
    return {
      inner: isLineman ? FIELD.COLORS.OFFENSE_OL : FIELD.COLORS.OFFENSE_LIGHT,
      outer: isLineman ? FIELD.COLORS.OFFENSE_DARK : FIELD.COLORS.OFFENSE_DARK,
      ring: "rgba(255,255,255,0.3)",
      ringWidth: 1.5,
      glowColor: "transparent",
      glowRadius: 0,
    };
  }

  // defense
  return {
    inner: FIELD.COLORS.DEFENSE_LIGHT,
    outer: FIELD.COLORS.DEFENSE_DARK,
    ring: "rgba(255,255,255,0.3)",
    ringWidth: 1.5,
    glowColor: "transparent",
    glowRadius: 0,
  };
}

export default function PlayerNode({
  player,
  isSelected,
  onSelect,
  onDragEnd,
  dragBoundFunc,
  animatedPosition,
  ghostPosition,
}: PlayerNodeProps) {
  const colors = getPlayerColors(player, isSelected);
  const R = FIELD.PLAYER_RADIUS;
  const isAnimating = !!animatedPosition;
  const posX = animatedPosition?.x ?? player.x;
  const posY = animatedPosition?.y ?? player.y;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onDragEnd(player.id, node.x(), node.y());
  };

  // Check if ghost is far enough from current to render
  const showGhost =
    ghostPosition &&
    isAnimating &&
    (Math.abs(ghostPosition.x - posX) > 1 ||
      Math.abs(ghostPosition.y - posY) > 1);

  return (
    <>
      {/* Motion trail ghost */}
      {showGhost && (
        <Group x={ghostPosition.x} y={ghostPosition.y} listening={false}>
          <Circle
            radius={R}
            fillRadialGradientStartPoint={{ x: -3, y: -3 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={R}
            fillRadialGradientColorStops={[
              0, colors.inner,
              1, colors.outer,
            ]}
            opacity={0.2}
          />
        </Group>
      )}

      <Group
        x={posX}
        y={posY}
        draggable={!isAnimating}
        dragBoundFunc={dragBoundFunc}
        onClick={() => onSelect(player.id)}
        onTap={() => onSelect(player.id)}
        onDragEnd={handleDragEnd}
        onMouseEnter={(e) => {
          if (isAnimating) return;
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "pointer";
        }}
        onMouseLeave={(e) => {
          if (isAnimating) return;
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
        }}
      >
      {/* Selection glow ring (only when selected) */}
      {isSelected && (
        <Circle
          radius={R + 6}
          fill="transparent"
          stroke={colors.glowColor}
          strokeWidth={4}
          opacity={0.6}
        />
      )}

      {/* Outer ring */}
      <Circle
        radius={R + 1.5}
        fill="transparent"
        stroke={colors.ring}
        strokeWidth={colors.ringWidth}
      />

      {/* Main circle with radial gradient */}
      <Circle
        radius={R}
        fillRadialGradientStartPoint={{ x: -3, y: -3 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={R}
        fillRadialGradientColorStops={[
          0, colors.inner,
          1, colors.outer,
        ]}
        shadowColor="rgba(0,0,0,0.6)"
        shadowBlur={isSelected ? 12 : 8}
        shadowOpacity={isSelected ? 0.5 : 0.4}
        shadowOffsetY={2}
      />

      {/* Label */}
      <Text
        text={player.label}
        fontSize={11}
        fontStyle="bold"
        fontFamily="Arial, sans-serif"
        fill={FIELD.COLORS.PLAYER_LABEL}
        align="center"
        verticalAlign="middle"
        width={R * 2}
        height={R * 2}
        offsetX={R}
        offsetY={R}
        shadowColor="rgba(0,0,0,0.7)"
        shadowBlur={2}
        shadowOffsetY={1}
      />
      </Group>
    </>
  );
}
