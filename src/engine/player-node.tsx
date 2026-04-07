"use client";

import { Group, Circle, Text } from "react-konva";
import { FIELD } from "./constants";
import type { CanvasPlayer } from "./types";
import type { KonvaEventObject } from "konva/lib/Node";

interface PlayerNodeProps {
  player: CanvasPlayer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export default function PlayerNode({
  player,
  isSelected,
  onSelect,
  onDragEnd,
}: PlayerNodeProps) {
  const fillColor = isSelected
    ? FIELD.COLORS.SELECTED
    : player.side === "offense"
      ? FIELD.COLORS.OFFENSE
      : FIELD.COLORS.DEFENSE;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onDragEnd(player.id, node.x(), node.y());
  };

  return (
    <Group
      x={player.x}
      y={player.y}
      draggable
      onClick={() => onSelect(player.id)}
      onTap={() => onSelect(player.id)}
      onDragEnd={handleDragEnd}
    >
      <Circle
        radius={FIELD.PLAYER_RADIUS}
        fill={fillColor}
        stroke={isSelected ? "#ffffff" : undefined}
        strokeWidth={isSelected ? 2 : 0}
        shadowColor="black"
        shadowBlur={6}
        shadowOpacity={0.3}
        shadowOffsetY={2}
      />
      <Text
        text={player.label}
        fontSize={10}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        width={FIELD.PLAYER_RADIUS * 2}
        height={FIELD.PLAYER_RADIUS * 2}
        offsetX={FIELD.PLAYER_RADIUS}
        offsetY={FIELD.PLAYER_RADIUS}
      />
    </Group>
  );
}
