export const Tier = {
  YOUTH: "youth",
  HIGH_SCHOOL: "high_school",
  COLLEGE: "college",
  PRO: "pro",
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

export const MemberRole = {
  OWNER: "owner",
  COACH: "coach",
  COORDINATOR: "coordinator",
  PLAYER: "player",
} as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const Side = {
  OFFENSE: "offense",
  DEFENSE: "defense",
  SPECIAL_TEAMS: "special_teams",
} as const;
export type Side = (typeof Side)[keyof typeof Side];

export const PlayType = {
  RUN: "run",
  PASS: "pass",
  PLAY_ACTION: "play_action",
  SCREEN: "screen",
  SPECIAL: "special",
} as const;
export type PlayType = (typeof PlayType)[keyof typeof PlayType];

export const Visibility = {
  PRIVATE: "private",
  SHARED: "shared",
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const AssignmentType = {
  ROUTE: "route",
  BLOCK: "block",
  BLITZ: "blitz",
  COVERAGE: "coverage",
  SPY: "spy",
} as const;
export type AssignmentType = (typeof AssignmentType)[keyof typeof AssignmentType];

export const QuestionType = {
  MULTIPLE_CHOICE: "multiple_choice",
  TAP_FIELD: "tap_field",
  IDENTIFY_ROUTE: "identify_route",
  SITUATION_MATCH: "situation_match",
  ASSIGNMENT_RECALL: "assignment_recall",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const MasteryLevel = {
  NEW: "new_play",
  LEARNING: "learning",
  REVIEWING: "reviewing",
  MASTERED: "mastered",
} as const;
export type MasteryLevel = (typeof MasteryLevel)[keyof typeof MasteryLevel];
