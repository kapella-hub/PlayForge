"use client";

import { Group, Rect, Text } from "react-konva";
import { FIELD } from "./constants";

export interface CoverageZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

export interface CoverageScheme {
  id: string;
  name: string;
  zones: CoverageZone[];
}

const LOS = FIELD.LINE_OF_SCRIMMAGE_Y;
const FW = FIELD.WIDTH;

// Deep zone colors
const DEEP_RED = "rgba(239,68,68,0.15)";
const DEEP_ORANGE = "rgba(249,115,22,0.15)";
const DEEP_BORDER = "rgba(239,68,68,0.5)";
const DEEP_ORANGE_BORDER = "rgba(249,115,22,0.5)";

// Underneath zone colors
const UNDER_BLUE = "rgba(59,130,246,0.15)";
const UNDER_TEAL = "rgba(20,184,166,0.15)";
const UNDER_BORDER = "rgba(59,130,246,0.5)";
const UNDER_TEAL_BORDER = "rgba(20,184,166,0.5)";

export const COVERAGE_SCHEMES: CoverageScheme[] = [
  {
    id: "cover-2",
    name: "Cover 2",
    zones: [
      // 2 deep halves
      { x: 0, y: 0, width: FW / 2, height: LOS - 120, label: "Deep Half", color: DEEP_RED },
      { x: FW / 2, y: 0, width: FW / 2, height: LOS - 120, label: "Deep Half", color: DEEP_RED },
      // 5 underneath zones
      { x: 0, y: LOS - 120, width: FW * 0.2, label: "CB Flat", height: 120, color: UNDER_BLUE },
      { x: FW * 0.2, y: LOS - 120, width: FW * 0.2, label: "Hook/Curl", height: 120, color: UNDER_TEAL },
      { x: FW * 0.4, y: LOS - 120, width: FW * 0.2, label: "Middle", height: 120, color: UNDER_BLUE },
      { x: FW * 0.6, y: LOS - 120, width: FW * 0.2, label: "Hook/Curl", height: 120, color: UNDER_TEAL },
      { x: FW * 0.8, y: LOS - 120, width: FW * 0.2, label: "CB Flat", height: 120, color: UNDER_BLUE },
    ],
  },
  {
    id: "cover-3",
    name: "Cover 3",
    zones: [
      // 3 deep thirds
      { x: 0, y: 0, width: FW / 3, height: LOS - 120, label: "Deep 1/3", color: DEEP_RED },
      { x: FW / 3, y: 0, width: FW / 3, height: LOS - 120, label: "Deep 1/3", color: DEEP_ORANGE },
      { x: (FW * 2) / 3, y: 0, width: FW / 3, height: LOS - 120, label: "Deep 1/3", color: DEEP_RED },
      // 4 underneath zones
      { x: 0, y: LOS - 120, width: FW * 0.25, label: "Flat", height: 120, color: UNDER_BLUE },
      { x: FW * 0.25, y: LOS - 120, width: FW * 0.25, label: "Hook", height: 120, color: UNDER_TEAL },
      { x: FW * 0.5, y: LOS - 120, width: FW * 0.25, label: "Hook", height: 120, color: UNDER_TEAL },
      { x: FW * 0.75, y: LOS - 120, width: FW * 0.25, label: "Flat", height: 120, color: UNDER_BLUE },
    ],
  },
  {
    id: "cover-4",
    name: "Cover 4 (Quarters)",
    zones: [
      // 4 deep quarters
      { x: 0, y: 0, width: FW / 4, height: LOS - 120, label: "Quarter", color: DEEP_RED },
      { x: FW / 4, y: 0, width: FW / 4, height: LOS - 120, label: "Quarter", color: DEEP_ORANGE },
      { x: FW / 2, y: 0, width: FW / 4, height: LOS - 120, label: "Quarter", color: DEEP_ORANGE },
      { x: (FW * 3) / 4, y: 0, width: FW / 4, height: LOS - 120, label: "Quarter", color: DEEP_RED },
      // 3 underneath zones
      { x: 0, y: LOS - 120, width: FW / 3, label: "Under", height: 120, color: UNDER_BLUE },
      { x: FW / 3, y: LOS - 120, width: FW / 3, label: "Middle", height: 120, color: UNDER_TEAL },
      { x: (FW * 2) / 3, y: LOS - 120, width: FW / 3, label: "Under", height: 120, color: UNDER_BLUE },
    ],
  },
  {
    id: "cover-1",
    name: "Cover 1 (Man Free)",
    zones: [
      // 1 deep safety zone
      { x: FW * 0.2, y: 0, width: FW * 0.6, height: LOS - 100, label: "Free Safety", color: DEEP_RED },
      // Man labels underneath
      { x: 0, y: LOS - 100, width: FW * 0.15, label: "Man", height: 100, color: UNDER_BLUE },
      { x: FW * 0.15, y: LOS - 100, width: FW * 0.175, label: "Man", height: 100, color: UNDER_TEAL },
      { x: FW * 0.325, y: LOS - 100, width: FW * 0.175, label: "Man", height: 100, color: UNDER_BLUE },
      { x: FW * 0.5, y: LOS - 100, width: FW * 0.175, label: "Man", height: 100, color: UNDER_TEAL },
      { x: FW * 0.675, y: LOS - 100, width: FW * 0.175, label: "Man", height: 100, color: UNDER_BLUE },
      { x: FW * 0.85, y: LOS - 100, width: FW * 0.15, label: "Man", height: 100, color: UNDER_TEAL },
    ],
  },
  {
    id: "cover-0",
    name: "Cover 0 (Blitz)",
    zones: [
      // No deep zone — all underneath
      { x: 0, y: LOS - 140, width: FW * 0.15, label: "Blitz", height: 140, color: UNDER_BLUE },
      { x: FW * 0.15, y: LOS - 140, width: FW * 0.175, label: "Man", height: 140, color: UNDER_TEAL },
      { x: FW * 0.325, y: LOS - 140, width: FW * 0.175, label: "Man", height: 140, color: UNDER_BLUE },
      { x: FW * 0.5, y: LOS - 140, width: FW * 0.175, label: "Man", height: 140, color: UNDER_TEAL },
      { x: FW * 0.675, y: LOS - 140, width: FW * 0.175, label: "Man", height: 140, color: UNDER_BLUE },
      { x: FW * 0.85, y: LOS - 140, width: FW * 0.15, label: "Blitz", height: 140, color: UNDER_TEAL },
    ],
  },
];

export function getCoverageScheme(id: string): CoverageScheme | undefined {
  return COVERAGE_SCHEMES.find((s) => s.id === id);
}

interface CoverageOverlayProps {
  schemeId: string;
}

export function CoverageOverlay({ schemeId }: CoverageOverlayProps) {
  const scheme = getCoverageScheme(schemeId);
  if (!scheme) return null;

  return (
    <Group listening={false}>
      {scheme.zones.map((zone, i) => {
        // Determine border color based on fill
        const isDeep = zone.color === DEEP_RED || zone.color === DEEP_ORANGE;
        const borderColor = isDeep
          ? zone.color === DEEP_ORANGE ? DEEP_ORANGE_BORDER : DEEP_BORDER
          : zone.color === UNDER_TEAL ? UNDER_TEAL_BORDER : UNDER_BORDER;

        return (
          <Group key={`${schemeId}-zone-${i}`}>
            <Rect
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={zone.color}
              stroke={borderColor}
              strokeWidth={1.5}
              dash={[6, 4]}
            />
            <Text
              x={zone.x}
              y={zone.y + zone.height / 2 - 7}
              width={zone.width}
              text={zone.label}
              fontSize={13}
              fontFamily="system-ui, sans-serif"
              fontStyle="bold"
              fill={isDeep ? "rgba(239,68,68,0.7)" : "rgba(59,130,246,0.7)"}
              align="center"
            />
          </Group>
        );
      })}
    </Group>
  );
}
