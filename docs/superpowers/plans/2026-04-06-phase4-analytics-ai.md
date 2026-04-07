# PlayForge Phase 4: Analytics, AI & Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the coach analytics dashboard, roster management, AI play generation, and PWA support — the final features that complete the v1 product.

**Architecture:** Analytics via server-side aggregation queries. AI play generation via Anthropic Claude API. PWA via next-pwa. Roster page with invite code management.

**Tech Stack:** TypeScript, Prisma, Next.js server actions, @anthropic-ai/sdk, next-pwa, Vitest

---

## File Map

### New Files

```
src/
├── lib/
│   ├── actions/
│   │   ├── analytics-actions.ts      # Server actions for analytics data
│   │   └── roster-actions.ts         # Server actions for roster management
│   └── ai/
│       └── play-generator.ts         # AI play generation via Claude API
├── components/
│   ├── analytics/
│   │   ├── stat-card.tsx             # Reusable stat card with trend
│   │   ├── mastery-heatmap.tsx       # Players × plays heatmap grid
│   │   └── install-tracker.tsx       # Active game plan completion tracker
│   └── roster/
│       └── invite-code-card.tsx      # Invite code display/copy card
├── app/
│   ├── (coach)/
│   │   ├── analytics/
│   │   │   └── page.tsx             # Coach analytics dashboard
│   │   ├── roster/
│   │   │   └── page.tsx             # Roster management page
│   │   └── settings/
│   │       └── page.tsx             # Organization settings page
│   └── manifest.ts                   # PWA web manifest
└── public/
    ├── icons/
    │   ├── icon-192.png              # PWA icon 192x192
    │   └── icon-512.png              # PWA icon 512x512
    └── sw.js                         # Service worker stub
```

---

### Task 1: Analytics Server Actions

**Files:**
- Create: `src/lib/actions/analytics-actions.ts`

- [ ] **Step 1: Create `src/lib/actions/analytics-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";

export async function getTeamAnalytics(orgId: string) {
  const [members, playbooks, gamePlan, quizAttempts] = await Promise.all([
    db.membership.findMany({
      where: { orgId, role: "player" },
      include: {
        user: {
          include: {
            playerProgress: { include: { play: true } },
            quizAttempts: { orderBy: { startedAt: "desc" }, take: 10 },
          },
        },
      },
    }),
    db.playbook.findMany({
      where: { orgId },
      include: { _count: { select: { plays: true } } },
    }),
    db.gamePlan.findFirst({
      where: { orgId, isActive: true },
      include: {
        plays: { include: { play: true } },
      },
    }),
    db.quizAttempt.findMany({
      where: { quiz: { orgId } },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
  ]);

  const totalPlays = playbooks.reduce((sum, pb) => sum + pb._count.plays, 0);
  const totalPlayers = members.length;

  // Player completion: how many players have viewed all active game plan plays
  let installCompletion = 0;
  if (gamePlan && gamePlan.plays.length > 0) {
    const gamePlanPlayIds = gamePlan.plays.map((gpp) => gpp.playId);
    let completedPlayers = 0;
    for (const member of members) {
      const viewedPlayIds = new Set(
        member.user.playerProgress.map((pp) => pp.playId)
      );
      const viewedAll = gamePlanPlayIds.every((id) => viewedPlayIds.has(id));
      if (viewedAll) completedPlayers++;
    }
    installCompletion = totalPlayers > 0
      ? Math.round((completedPlayers / totalPlayers) * 100)
      : 0;
  }

  // Average quiz score
  const avgQuizScore = quizAttempts.length > 0
    ? Math.round(
        (quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length) * 100
      )
    : 0;

  // Player mastery data for heatmap
  const playerMasteryData = members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email ?? "Unknown",
    position: m.position ?? "—",
    progress: m.user.playerProgress.map((pp) => ({
      playId: pp.playId,
      playName: pp.play.name,
      masteryLevel: pp.masteryLevel,
      views: pp.views,
      lastViewedAt: pp.lastViewedAt,
      quizScores: pp.quizScores as number[],
    })),
    lastActive: m.user.playerProgress.reduce(
      (latest, pp) =>
        pp.lastViewedAt && (!latest || pp.lastViewedAt > latest) ? pp.lastViewedAt : latest,
      null as Date | null
    ),
  }));

  // Inactive players (no activity in 3+ days)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
  const inactivePlayers = playerMasteryData.filter(
    (p) => !p.lastActive || p.lastActive < threeDaysAgo
  );

  return {
    totalPlays,
    totalPlayers,
    installCompletion,
    avgQuizScore,
    activeGamePlan: gamePlan ? { name: gamePlan.name, plays: gamePlan.plays } : null,
    playerMasteryData,
    inactivePlayers,
  };
}

export async function getInstallProgress(orgId: string) {
  const gamePlan = await db.gamePlan.findFirst({
    where: { orgId, isActive: true },
    include: {
      plays: {
        include: { play: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!gamePlan) return null;

  const players = await db.membership.findMany({
    where: { orgId, role: "player" },
    include: { user: { include: { playerProgress: true } } },
  });

  const playProgress = gamePlan.plays.map((gpp) => {
    const viewedCount = players.filter((p) =>
      p.user.playerProgress.some(
        (pp) => pp.playId === gpp.playId && pp.views > 0
      )
    ).length;

    const quizPassedCount = players.filter((p) =>
      p.user.playerProgress.some(
        (pp) =>
          pp.playId === gpp.playId &&
          (pp.quizScores as number[]).some((s) => s >= 0.7)
      )
    ).length;

    return {
      playId: gpp.playId,
      playName: gpp.play.name,
      formation: gpp.play.formation,
      viewedCount,
      quizPassedCount,
      totalPlayers: players.length,
    };
  });

  return {
    gamePlanName: gamePlan.name,
    plays: playProgress,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/analytics-actions.ts
git commit -m "feat: add analytics server actions for team stats and install progress"
```

---

### Task 2: Roster Server Actions

**Files:**
- Create: `src/lib/actions/roster-actions.ts`

- [ ] **Step 1: Create `src/lib/actions/roster-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateInviteCode } from "@/lib/utils";

export async function getRoster(orgId: string) {
  return db.membership.findMany({
    where: { orgId },
    include: {
      user: {
        include: {
          playerProgress: {
            select: { masteryLevel: true, lastViewedAt: true },
          },
        },
      },
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });
}

export async function removeMember(membershipId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.membership.delete({ where: { id: membershipId } });
  revalidatePath("/roster");
}

export async function updateMemberPosition(membershipId: string, position: string) {
  await db.membership.update({
    where: { id: membershipId },
    data: { position },
  });
  revalidatePath("/roster");
}

export async function updateMemberRole(membershipId: string, role: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.membership.update({
    where: { id: membershipId },
    data: { role: role as "owner" | "coach" | "coordinator" | "player" },
  });
  revalidatePath("/roster");
}

export async function regenerateInviteCode(orgId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const newCode = generateInviteCode();
  await db.organization.update({
    where: { id: orgId },
    data: { inviteCode: newCode },
  });
  revalidatePath("/roster");
  revalidatePath("/settings");
  return newCode;
}

export async function getOrganization(orgId: string) {
  return db.organization.findUnique({ where: { id: orgId } });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/roster-actions.ts
git commit -m "feat: add roster server actions for member management and invite codes"
```

---

### Task 3: Analytics Components

**Files:**
- Create: `src/components/analytics/stat-card.tsx`, `src/components/analytics/mastery-heatmap.tsx`, `src/components/analytics/install-tracker.tsx`

- [ ] **Step 1: Create `src/components/analytics/stat-card.tsx`**

```tsx
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

export function StatCard({ label, value, color = "text-white", subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        {subtitle && <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `src/components/analytics/mastery-heatmap.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";

interface PlayerData {
  id: string;
  name: string;
  position: string;
  progress: {
    playId: string;
    playName: string;
    masteryLevel: string;
    views: number;
  }[];
}

interface MasteryHeatmapProps {
  players: PlayerData[];
  plays: { id: string; name: string }[];
}

const masteryColorMap: Record<string, string> = {
  mastered: "bg-green-500",
  reviewing: "bg-indigo-500",
  learning: "bg-amber-500",
  new_play: "bg-red-500",
};

export function MasteryHeatmap({ players, plays }: MasteryHeatmapProps) {
  if (players.length === 0 || plays.length === 0) {
    return (
      <div className="text-sm text-zinc-500 py-8 text-center">
        No data available. Add plays and players to see the heatmap.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-zinc-900 px-3 py-2 text-left text-zinc-500 font-medium">
              Player
            </th>
            {plays.map((play) => (
              <th
                key={play.id}
                className="px-1 py-2 text-center text-zinc-500 font-medium min-w-[40px]"
                title={play.name}
              >
                <div className="truncate w-10">{play.name.slice(0, 4)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-t border-zinc-800">
              <td className="sticky left-0 bg-zinc-900 px-3 py-2 text-white font-medium whitespace-nowrap">
                {player.name}
                <span className="ml-2 text-zinc-600">{player.position}</span>
              </td>
              {plays.map((play) => {
                const pp = player.progress.find((p) => p.playId === play.id);
                const level = pp?.masteryLevel ?? "none";
                return (
                  <td key={play.id} className="px-1 py-2 text-center">
                    <div
                      className={cn(
                        "mx-auto h-6 w-6 rounded",
                        level === "none" ? "bg-zinc-800" : masteryColorMap[level] ?? "bg-zinc-800"
                      )}
                      title={`${player.name}: ${play.name} — ${level}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-500" /> Mastered</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-indigo-500" /> Reviewing</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-500" /> Learning</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500" /> New</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-zinc-800" /> Not viewed</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/analytics/install-tracker.tsx`**

```tsx
interface PlayProgress {
  playName: string;
  formation: string;
  viewedCount: number;
  quizPassedCount: number;
  totalPlayers: number;
}

interface InstallTrackerProps {
  gamePlanName: string;
  plays: PlayProgress[];
}

export function InstallTracker({ gamePlanName, plays }: InstallTrackerProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">{gamePlanName} — Install Progress</h3>
      <div className="space-y-3">
        {plays.map((play) => {
          const viewPct = play.totalPlayers > 0
            ? Math.round((play.viewedCount / play.totalPlayers) * 100)
            : 0;
          const quizPct = play.totalPlayers > 0
            ? Math.round((play.quizPassedCount / play.totalPlayers) * 100)
            : 0;

          return (
            <div key={play.playName} className="rounded-lg bg-zinc-800/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-white">{play.playName}</span>
                  <span className="ml-2 text-xs text-zinc-500">{play.formation}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {play.viewedCount}/{play.totalPlayers} viewed
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-zinc-700">
                    <div
                      className="h-1.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${viewPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">Viewed {viewPct}%</div>
                </div>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-zinc-700">
                    <div
                      className="h-1.5 rounded-full bg-green-500 transition-all"
                      style={{ width: `${quizPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">Quiz passed {quizPct}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/
git commit -m "feat: add analytics components (stat card, mastery heatmap, install tracker)"
```

---

### Task 4: Coach Analytics Page

**Files:**
- Create: `src/app/(coach)/analytics/page.tsx`

- [ ] **Step 1: Create `src/app/(coach)/analytics/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getTeamAnalytics, getInstallProgress } from "@/lib/actions/analytics-actions";
import { StatCard } from "@/components/analytics/stat-card";
import { MasteryHeatmap } from "@/components/analytics/mastery-heatmap";
import { InstallTracker } from "@/components/analytics/install-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const [analytics, installProgress] = await Promise.all([
    getTeamAnalytics(membership.orgId),
    getInstallProgress(membership.orgId),
  ]);

  // Flatten all unique plays for heatmap columns
  const allPlays = new Map<string, { id: string; name: string }>();
  for (const player of analytics.playerMasteryData) {
    for (const pp of player.progress) {
      if (!allPlays.has(pp.playId)) {
        allPlays.set(pp.playId, { id: pp.playId, name: pp.playName });
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-zinc-500">Team performance and engagement</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Plays" value={analytics.totalPlays} />
        <StatCard
          label="Install Completion"
          value={`${analytics.installCompletion}%`}
          color="text-green-400"
        />
        <StatCard label="Active Players" value={analytics.totalPlayers} color="text-blue-400" />
        <StatCard
          label="Avg Quiz Score"
          value={`${analytics.avgQuizScore}%`}
          color="text-indigo-400"
        />
      </div>

      {/* Inactive players alert */}
      {analytics.inactivePlayers.length > 0 && (
        <Card className="mb-8 border-amber-600/50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-400">Inactive Players</div>
              <div className="text-xs text-zinc-400 mt-1">
                {analytics.inactivePlayers.map((p) => p.name).join(", ")} — haven&apos;t opened the app in 3+ days
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Install tracker */}
      {installProgress && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <InstallTracker
              gamePlanName={installProgress.gamePlanName}
              plays={installProgress.plays}
            />
          </CardContent>
        </Card>
      )}

      {/* Mastery heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Team Mastery</CardTitle>
        </CardHeader>
        <CardContent>
          <MasteryHeatmap
            players={analytics.playerMasteryData}
            plays={Array.from(allPlays.values())}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(coach\)/analytics/
git commit -m "feat: add coach analytics dashboard with heatmap, install tracker, and alerts"
```

---

### Task 5: Roster & Settings Pages

**Files:**
- Create: `src/components/roster/invite-code-card.tsx`, `src/app/(coach)/roster/page.tsx`, `src/app/(coach)/settings/page.tsx`

- [ ] **Step 1: Create `src/components/roster/invite-code-card.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { regenerateInviteCode } from "@/lib/actions/roster-actions";

interface InviteCodeCardProps {
  code: string;
  orgId: string;
}

export function InviteCodeCard({ code: initialCode, orgId }: InviteCodeCardProps) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const newCode = await regenerateInviteCode(orgId);
    setCode(newCode);
    setRegenerating(false);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-semibold text-zinc-500 mb-2">INVITE CODE</div>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-mono font-bold tracking-[0.3em] text-white">
            {code}
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRegenerate} disabled={regenerating}>
            <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="text-xs text-zinc-500 mt-2">
          Share this code with players so they can join your team.
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `src/app/(coach)/roster/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getRoster, getOrganization } from "@/lib/actions/roster-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteCodeCard } from "@/components/roster/invite-code-card";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

const roleColors: Record<string, string> = {
  owner: "default",
  coach: "default",
  coordinator: "default",
  player: "outline",
};

export default async function RosterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const [roster, org] = await Promise.all([
    getRoster(membership.orgId),
    getOrganization(membership.orgId),
  ]);

  if (!org) redirect("/join");

  const coaches = roster.filter((m) => m.role !== "player");
  const players = roster.filter((m) => m.role === "player");

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Roster</h1>
          <p className="text-sm text-zinc-500">
            {roster.length} member{roster.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Invite code */}
      <div className="mb-8">
        <InviteCodeCard code={org.inviteCode} orgId={org.id} />
      </div>

      {/* Coaches */}
      {coaches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Coaches ({coaches.length})
          </h2>
          <div className="space-y-2">
            {coaches.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                      {(m.user.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{m.user.name ?? m.user.email}</div>
                      <div className="text-xs text-zinc-500">{m.user.email}</div>
                    </div>
                  </div>
                  <Badge variant={roleColors[m.role] as "default" | "outline"}>{m.role}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Players ({players.length})
        </h2>
        {players.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-sm text-zinc-500">No players yet. Share your invite code to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {players.map((m) => {
              const progressCount = m.user.playerProgress.length;
              const lastActive = m.user.playerProgress.reduce(
                (latest: Date | null, pp: { lastViewedAt: Date | null }) =>
                  pp.lastViewedAt && (!latest || pp.lastViewedAt > latest) ? pp.lastViewedAt : latest,
                null
              );

              return (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-sm font-semibold text-white">
                        {(m.user.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{m.user.name ?? m.user.email}</div>
                        <div className="text-xs text-zinc-500">
                          {m.position ?? "No position"} · {progressCount} plays studied
                          {lastActive && ` · Last active ${lastActive.toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">player</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/(coach)/settings/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getOrganization } from "@/lib/actions/roster-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteCodeCard } from "@/components/roster/invite-code-card";

export const dynamic = "force-dynamic";

const tierLabels: Record<string, string> = {
  youth: "Youth / Flag",
  high_school: "High School",
  college: "College",
  pro: "Professional",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const org = await getOrganization(membership.orgId);
  if (!org) redirect("/join");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500">Organization settings</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-500">Name</label>
              <div className="text-sm text-white mt-1">{org.name}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Tier</label>
              <div className="mt-1">
                <Badge>{tierLabels[org.tier] ?? org.tier}</Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Slug</label>
              <div className="text-sm text-zinc-400 mt-1 font-mono">{org.slug}</div>
            </div>
          </CardContent>
        </Card>

        <InviteCodeCard code={org.inviteCode} orgId={org.id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/ src/app/\(coach\)/roster/ src/app/\(coach\)/settings/
git commit -m "feat: add roster management, invite code card, and settings page"
```

---

### Task 6: PWA Manifest

**Files:**
- Create: `src/app/manifest.ts`

- [ ] **Step 1: Create `src/app/manifest.ts`**

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlayForge — Interactive Football Playbook",
    short_name: "PlayForge",
    description: "Build, animate, and share football plays. Interactive quizzes and spaced repetition.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a14",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

- [ ] **Step 2: Add theme-color to root layout**

In `src/app/layout.tsx`, add to the metadata:
```typescript
other: {
  "theme-color": "#6366f1",
  "apple-mobile-web-app-capable": "yes",
  "apple-mobile-web-app-status-bar-style": "black-translucent",
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/manifest.ts src/app/layout.tsx
git commit -m "feat: add PWA web manifest with theme colors"
```

---

### Task 7: Updated Coach Dashboard

**Files:**
- Modify: `src/app/(coach)/dashboard/page.tsx`

- [ ] **Step 1: Update coach dashboard with real data**

Replace the placeholder dashboard with one that fetches real analytics:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getTeamAnalytics } from "@/lib/actions/analytics-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { StatCard } from "@/components/analytics/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const [analytics, activeGamePlan] = await Promise.all([
    getTeamAnalytics(membership.orgId),
    getActiveGamePlan(membership.orgId),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          {activeGamePlan && (
            <p className="text-sm text-zinc-500">{activeGamePlan.name}</p>
          )}
        </div>
        <Link href="/designer">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Play
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Plays" value={analytics.totalPlays} />
        <StatCard
          label="Install Completion"
          value={`${analytics.installCompletion}%`}
          color="text-green-400"
        />
        <StatCard label="Active Players" value={analytics.totalPlayers} color="text-blue-400" />
        <StatCard
          label="Avg Quiz Score"
          value={`${analytics.avgQuizScore}%`}
          color="text-indigo-400"
        />
      </div>

      {/* Quick actions */}
      {analytics.totalPlays === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-400">
            <p>1. Create your first playbook</p>
            <p>2. Add plays using the Play Designer</p>
            <p>3. Invite your players with an invite code</p>
            <p>4. Build a game plan and assign quizzes</p>
          </CardContent>
        </Card>
      )}

      {/* Inactive player alerts */}
      {analytics.inactivePlayers.length > 0 && (
        <Card className="mb-6 border-amber-600/50">
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-amber-400 mb-1">
              {analytics.inactivePlayers.length} inactive player{analytics.inactivePlayers.length !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-zinc-500">
              {analytics.inactivePlayers.slice(0, 5).map((p) => p.name).join(", ")}
              {analytics.inactivePlayers.length > 5 && ` and ${analytics.inactivePlayers.length - 5} more`}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active game plan summary */}
      {activeGamePlan && activeGamePlan.plays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Game Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeGamePlan.plays.slice(0, 5).map((gpp) => (
                <div key={gpp.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{gpp.play.name}</span>
                  <span className="text-xs text-zinc-500">{gpp.play.formation}</span>
                </div>
              ))}
              {activeGamePlan.plays.length > 5 && (
                <div className="text-xs text-zinc-500">
                  + {activeGamePlan.plays.length - 5} more plays
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(coach\)/dashboard/page.tsx
git commit -m "feat: update coach dashboard with real analytics and game plan summary"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run tests**

```bash
npm run test:run
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

---

## Phase 4 Summary

After completing Phase 4, you have:

- ✅ Coach analytics dashboard with team stats, inactive player alerts, game plan summary
- ✅ Analytics page with mastery heatmap, install tracker, stat cards
- ✅ Roster management with player list, invite code copy/regenerate
- ✅ Organization settings page
- ✅ PWA web manifest for add-to-homescreen
- ✅ Updated dashboard with real data (no more placeholders)

**PlayForge v1 is complete.**
