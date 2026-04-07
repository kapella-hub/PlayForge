# Architecture

This document describes the technical architecture of PlayForge, an interactive football playbook platform built with Next.js, Konva.js, and PostgreSQL.

---

## System Overview

```
                              +------------------+
                              |   Browser (PWA)  |
                              |                  |
                              |  React 19 + Konva|
                              +--------+---------+
                                       |
                              HTTP / WebSocket
                                       |
                              +--------+---------+
                              |   Next.js 16     |
                              |   App Router     |
                              |                  |
                              | - Server Actions |
                              | - API Routes     |
                              | - SSR / RSC      |
                              +--------+---------+
                                       |
                     +-----------------+------------------+
                     |                                    |
              +------+------+                    +--------+--------+
              | PostgreSQL  |                    | Anthropic API   |
              | (Prisma 7)  |                    | (Claude)        |
              +-------------+                    +-----------------+
```

**Request flow:**
1. Browser loads server-rendered pages via Next.js App Router
2. Interactive components hydrate on the client (canvas, forms, panels)
3. Data mutations use Next.js Server Actions (direct RPC, no REST needed)
4. Two REST API routes exist: AI play generation (`/api/ai/generate-play`) and auth endpoints (`/api/auth/*`)
5. The database is accessed exclusively through Prisma with the `@prisma/adapter-pg` driver adapter

---

## Route Groups

The app uses Next.js route groups to separate coach and player experiences:

```
app/
  (auth)/        # Public auth pages (login, signup, join)
    layout.tsx   # Centered card layout, no sidebar
  (coach)/       # Coach/coordinator pages
    layout.tsx   # Sidebar navigation (CoachSidebar component)
  (player)/      # Player pages
    layout.tsx   # Bottom tab navigation (PlayerTabs component)
```

Each group has its own layout component. Auth state is checked via `auth()` from NextAuth, and the membership role determines which group the user sees.

---

## Canvas Engine Architecture

The play designer is built on [Konva.js](https://konvajs.org/) via `react-konva`. The canvas uses a layered architecture for rendering performance and interaction separation.

### Layer Stack

```
+-----------------------------------------+
| Layer 1: Field Background    (listening: false)
|   FieldRenderer — grass, yard lines,
|   hash marks, end zones, vignette
+-----------------------------------------+
| Layer 1.5: Coverage Overlay  (listening: false)
|   CoverageOverlay — zone rectangles
|   with labels for Cover 0-4
+-----------------------------------------+
| Layer 2: Interactive Layer
|   - MotionArrow (pre-snap motion paths)
|   - RouteLine (player routes with arrows)
|   - Preview line (cursor follow during draw)
|   - PlayerNode (draggable circles)
|   - ReadIndicator (QB read numbers)
|   - Ball (animated football sprite)
+-----------------------------------------+
```

The field background layer has `listening: false` to avoid capturing pointer events. All interactive elements (player drag, route drawing, click-to-select) happen on Layer 2.

### Coordinate System

| Property                | Value   | Notes                                          |
|-------------------------|---------|-------------------------------------------------|
| Canvas width            | 1000 px | Logical units; actual screen size is responsive |
| Canvas height           | 600 px  |                                                 |
| Line of Scrimmage (LOS) | y = 350 | Horizontal line dividing offense/defense       |
| Offense                 | y > 350 | Below the LOS (higher y values)                |
| Defense                 | y < 350 | Above the LOS (lower y values)                 |
| Field center            | x = 500 |                                                 |
| Sidelines               | ~x = 50, ~x = 950 |                                      |
| Player radius           | 16 px   |                                                 |
| Yard line spacing       | 30 px   |                                                 |
| Hash marks              | 37.3% and 62.7% from left edge (NFL ratio)     |

The canvas scales to fit its container while maintaining the 1000x600 aspect ratio. Pointer events are converted from screen coordinates to field coordinates using the scale factors:

```typescript
const scaleX = dimensions.width / FIELD.WIDTH;   // screen / logical
const scaleY = dimensions.height / FIELD.HEIGHT;
```

### Key Components

| Component           | File                        | Purpose                                    |
|---------------------|-----------------------------|--------------------------------------------|
| `PlayCanvas`        | `engine/play-canvas.tsx`    | Main canvas, manages layers and interaction |
| `FieldRenderer`     | `engine/field-renderer.tsx` | Draws field background                     |
| `PlayerNode`        | `engine/player-node.tsx`    | Draggable player circle with label         |
| `RouteLine`         | `engine/route-line.tsx`     | Route path with arrowhead                  |
| `MotionArrow`       | `engine/motion-arrow.tsx`   | Pre-snap motion path                       |
| `CoverageOverlay`   | `engine/coverage-zone.tsx`  | Zone coverage visualization                |
| `Ball`              | `engine/ball.tsx`           | Animated football                          |
| `ReadIndicator`     | `engine/read-indicator.tsx` | QB read progression numbers                |

---

## Data Flow: Play Creation and Storage

### Creating a Play

```
User selects formation
  -> FormationPicker emits FormationTemplate
  -> DesignerPage creates CanvasData { players, routes: [], motions: [], meta }
  -> PlayCanvas renders players on field

User draws routes
  -> Click player: starts route (waypoint at player position)
  -> Click field: adds waypoint to route
  -> Double-click / Enter / click same player: finishes route
  -> detectRouteType() auto-labels the route (Go, Slant, Post, etc.)

User saves
  -> Server Action: createPlay() or updatePlay()
  -> updatePlay() auto-snapshots current state as PlayVersion before writing
  -> canvasData stored as JSON column in Play table
  -> revalidatePath() triggers re-render of affected pages
```

### Canvas Data Shape

```typescript
interface CanvasData {
  players: CanvasPlayer[];    // { id, label, x, y, side }
  routes: Route[];            // { playerId, waypoints[], type, routeType? }
  motions: MotionPath[];      // { playerId, fromX, fromY, toX, toY }
  meta: {
    formation: string;        // formation template ID
    playType: string;         // run | pass | play_action | screen | special
    side: "offense" | "defense";
  };
}
```

This JSON is stored directly in the `Play.canvasData` column (Prisma `Json` type). The `deserializeCanvas()` function handles backward compatibility (e.g., adding the `motions` array if missing from older records).

---

## Authentication Flow

PlayForge uses NextAuth v5 (`next-auth@5.0.0-beta.30`) with the Prisma adapter.

### Providers

| Provider         | Condition                           | Session Strategy |
|------------------|-------------------------------------|------------------|
| Google OAuth     | `GOOGLE_CLIENT_ID` is set           | Database         |
| Dev Credentials  | `NODE_ENV !== "production"`         | JWT              |

In development, the credentials provider accepts any email that exists in the `User` table (no password). This is gated behind the environment check and is never active in production.

### Session Handling

- **Production:** Database sessions via Prisma adapter
- **Development:** JWT sessions (required for the credentials provider, which does not support database sessions)

The `session` callback injects `user.id` into the session object from either `token.id` (JWT mode) or `user.id` (database mode).

### Signup Flow

1. User submits name, email, organization name to `POST /api/auth/signup`
2. Server creates a `User`, `Organization` (with auto-generated slug and invite code), and `Membership` (role: owner)
3. Redirects to login page

### Join (Invite) Flow

1. User navigates to `/join?code=PLAY01`
2. Client calls `GET /api/auth/verify-invite?code=PLAY01` to validate and display org name
3. User submits name, email, position
4. `POST /api/auth/join` upserts user, creates `Membership` (role: player)

---

## Spaced Repetition Algorithm

PlayForge uses the **SM-2 algorithm** (SuperMemo 2) to schedule play reviews. The implementation is in `src/lib/spaced-repetition/sm2.ts`.

### Core State

Each `PlayerProgress` record tracks:

| Field          | Type    | Description                                     |
|----------------|---------|--------------------------------------------------|
| `easeFactor`   | Float   | Difficulty multiplier (minimum 1.3, default 2.5) |
| `intervalDays` | Float   | Days until next review                           |
| `nextReviewAt` | DateTime| Absolute timestamp of next scheduled review      |
| `masteryLevel` | Enum    | Derived from interval (see below)                |

### Quality Mapping

Quiz scores map to SM-2 quality ratings (0-5):

| Score Range | Quality | Meaning            |
|-------------|---------|---------------------|
| >= 95%      | 5       | Perfect recall       |
| >= 80%      | 4       | Correct, hesitation  |
| >= 60%      | 3       | Correct, difficulty  |
| >= 40%      | 2       | Incorrect, familiar  |
| >= 20%      | 1       | Incorrect, some memory |
| < 20%       | 0       | Complete blackout    |

### Interval Calculation

```
if quality < 3:
  interval = 1 day (reset)
  repetition = 0
else:
  if repetition == 0: interval = 1
  if repetition == 1: interval = 3
  else: interval = previousInterval * easeFactor
```

The ease factor adjusts with each review: `EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`, clamped to a minimum of 1.3.

### Mastery Levels

| Interval     | Level      |
|--------------|------------|
| 0 days       | `new_play` |
| < 3 days     | `learning` |
| 3-21 days    | `reviewing`|
| > 21 days    | `mastered` |

---

## Animation System

The animation engine (`src/engine/animation-engine.ts`) generates smooth playback from the static route data.

### Pipeline

```
CanvasData (routes + players)
  -> generateKeyframes()
     -> For each player with a route: sample 30 positions along waypoint path
     -> For stationary players: two keyframes (start and end) at their position
     -> Detect QB and receivers for ball flight
  -> AnimationData { keyframes, duration (3s), ballFlight? }

During playback:
  -> getAnimationFrame(animationData, canvasData, currentTime)
     -> Normalize time to 0..1
     -> Interpolate each player's position from their keyframes
     -> Calculate ball position (parabolic arc from QB to receiver)
     -> Determine active QB read number
  -> Returns AnimationState { playerPositions, ballPosition, activeRead }
```

### Ball Flight

For pass plays, the ball is thrown at 60% through the animation (normalized time 0.6) and arrives 25% of duration later. The flight path uses linear x/y interpolation with a parabolic vertical arc: `arcHeight = -40 * t * (1 - t)`.

### QB Read Progression

During the first 70% of the play, reads cycle through receivers evenly. Each receiver with a route >= 2 waypoints is assigned a read number (1, 2, 3...). The `ReadIndicator` component displays these as numbered bubbles with active/past/future styling.

---

## AI Integration

The AI play generator (`src/lib/ai/play-generator.ts`) uses the Anthropic Claude API to create plays from natural language descriptions.

### Architecture

```
Client (AIGenerator component)
  -> POST /api/ai/generate-play { description, side?, formation?, gameFormat? }
  -> Route handler validates auth + input
  -> generatePlayFromDescription()
     -> Constructs system prompt with:
        - Field coordinate system documentation
        - All available formations (with player positions)
        - All available route templates (with offsets)
        - Output format specification (CanvasData JSON)
     -> Sends to Claude claude-sonnet-4-20250514 (max 4096 tokens)
     -> Parses JSON response
     -> Validates structure (players, routes, meta required)
  -> Returns CanvasData to client
  -> Client loads CanvasData into the designer canvas
```

### Error Handling

| Error Condition          | HTTP Status | User Message                                        |
|--------------------------|-------------|-----------------------------------------------------|
| Missing `ANTHROPIC_API_KEY` | 503      | "ANTHROPIC_API_KEY is not set..."                   |
| Empty description        | 400         | "Description is required"                           |
| Invalid JSON from AI     | 500         | "AI returned invalid play data. Please try rephrasing..." |
| API failure              | 500         | Error message from Claude API                       |

---

## Gamification System

The gamification layer (`src/lib/gamification.ts`) provides XP, levels, and badges based on player activity.

### XP Calculation

```
XP = (totalViews * 10) + (totalQuizzes * 50) + (playsMastered * 100) + (currentStreak * 25)
```

### Level Progression

| Level | Title        | XP Required |
|-------|-------------|-------------|
| 1     | Rookie       | 0           |
| 2     | Starter      | 100         |
| 3     | Contributor  | 300         |
| 4     | Playmaker    | 600         |
| 5     | Captain      | 1,000       |
| 6     | All-Star     | 1,500       |
| 7     | MVP          | 2,500       |

### Badges

10 earnable badges tracking views, quizzes, streaks, mastery, and overall activity. Examples: "First Down" (first view), "Perfect Score" (100% quiz), "Playbook Scholar" (master all assigned plays).

---

## Leaderboard Scoring

The composite leaderboard score (`src/lib/actions/analytics-actions.ts`) weights four factors:

| Factor       | Weight | Normalization                |
|-------------|--------|------------------------------|
| Mastery %    | 40%    | plays mastered / total plays |
| Quiz Average | 30%    | Already 0-1 scale            |
| Study Time   | 20%    | Capped at 3,600 seconds      |
| Streak       | 10%    | Capped at 30 days            |

Final score = `round((mastery * 0.4 + quiz * 0.3 + study * 0.2 + streak * 0.1) * 100)`

Leaderboard supports filtering by position group.
