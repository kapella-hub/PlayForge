# PlayForge — Design Specification

**Date:** 2026-04-06
**Status:** Draft
**Repo:** https://github.com/kapella-hub/PlayForge.git

## Overview

PlayForge is a modern, interactive football playbook platform that enables coaches to build, animate, and share plays while giving players an engaging, mobile-first learning experience with built-in quizzes and spaced repetition. It targets all competitive levels: youth/flag, high school, and pro/college.

## Goals

- Replace static playbook PDFs and clunky legacy tools (e.g., ReadyList Sports) with a modern, beautiful, responsive web app
- Provide a best-in-class drag-and-drop play designer with animated playback
- Help players learn and retain plays through spaced repetition and interactive quizzes
- Give coaches real-time visibility into player comprehension and study habits
- Be mobile-first for players, desktop-optimized for coaches, tablet-friendly for sideline use

## Non-Goals (v1)

- Native mobile apps (PWA covers this)
- Real-time play-calling during games (future feature)
- Video hosting (link to external film, don't host it)
- Multi-sport support (football only)
- Billing/subscription management (build for it later)

---

## Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Server components, server actions, API routes in one codebase |
| UI | React 19, TailwindCSS v4, Framer Motion | Modern, responsive, beautiful animations |
| Canvas | Konva.js (react-konva) | Mature 2D canvas with touch support, good perf |
| Database | PostgreSQL + Prisma ORM | Relational data, type-safe queries, migration support |
| Auth | NextAuth.js v5 | Magic link, Google, email — flexible for SaaS or self-hosted |
| Deployment | Vercel (primary), Docker (self-hosted) | One-click deploy with self-hosted option |

### Project Structure

```
playforge/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Login, signup, invite flows
│   │   ├── (coach)/            # Coach-facing pages
│   │   │   ├── dashboard/
│   │   │   ├── playbooks/
│   │   │   ├── game-plans/
│   │   │   ├── designer/       # Play designer (canvas)
│   │   │   ├── roster/
│   │   │   ├── quizzes/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── (player)/           # Player-facing pages
│   │   │   ├── home/           # Study feed
│   │   │   ├── plays/          # Browse assigned plays
│   │   │   ├── quiz/           # Take quizzes
│   │   │   └── progress/       # Personal dashboard
│   │   └── api/                # API route handlers
│   ├── components/
│   │   ├── ui/                 # Shared UI primitives (buttons, cards, inputs)
│   │   ├── layout/             # Sidebar, nav, mobile shell
│   │   └── play/               # Play-related components (field, player nodes)
│   ├── engine/                 # Play canvas engine (architecturally separate)
│   │   ├── field/              # Field renderer (yard lines, hashes, numbers)
│   │   ├── players/            # Player nodes, dragging, positioning
│   │   ├── routes/             # Route drawing, bezier curves, arrowheads
│   │   ├── animation/          # Timeline, keyframes, playback controls
│   │   └── serialization/      # Canvas state ↔ JSON (save/load)
│   ├── lib/
│   │   ├── db/                 # Prisma client, queries
│   │   ├── auth/               # Auth config, session helpers
│   │   ├── quiz/               # Quiz engine, scoring
│   │   ├── spaced-repetition/  # SM-2 algorithm, review scheduling
│   │   └── ai/                 # AI play generation, smart tagging
│   └── types/                  # Shared TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
└── tests/
```

### Key Architectural Decision: Separated Canvas Engine

The `src/engine/` directory is the play designer canvas — the core IP. It is:
- A standalone package that depends only on Konva.js and core types
- Importable by the Next.js app but not coupled to it
- Extractable into its own npm package later (for native apps, embeds, etc.)
- Independently testable with unit tests against canvas state

---

## Data Model

### Organization

Top-level tenant. Represents a team, program, or club.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | "Lincoln High Varsity" |
| slug | String | URL-safe identifier |
| logo_url | String? | Team logo |
| tier | Enum | youth, high_school, college, pro |
| invite_code | String | 6-char code for player/coach onboarding |
| created_at | DateTime | |

### User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | Unique |
| name | String | |
| avatar_url | String? | |
| created_at | DateTime | |

### Membership

Join table: User ↔ Organization with role.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| org_id | UUID | FK → Organization |
| role | Enum | owner, coach, coordinator, player |
| position_group | String? | For coordinators: "offense", "defense", "special_teams" |
| position | String? | For players: "QB", "WR", "CB", etc. |

### Playbook

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| org_id | UUID | FK → Organization |
| name | String | "Base Offense 2026" |
| description | String? | |
| side | Enum | offense, defense, special_teams |
| visibility | Enum | private, shared |
| created_by | UUID | FK → User |
| created_at | DateTime | |

### Play

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| playbook_id | UUID | FK → Playbook |
| name | String | "Mesh Concept" |
| formation | String | "Shotgun 2x2" |
| play_type | Enum | run, pass, play_action, screen, special |
| situation_tags | String[] | ["3rd & medium", "red zone"] |
| canvas_data | JSON | Serialized canvas state (positions, routes) |
| animation_data | JSON | Keyframes, timing per player |
| notes | String? | Coach annotations |
| film_url | String? | External video link |
| thumbnail_url | String? | Auto-generated play preview image |
| created_by | UUID | FK → User |
| created_at | DateTime | |
| updated_at | DateTime | |

### PlayAssignment

Per-position assignment within a play.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| play_id | UUID | FK → Play |
| position | String | "WR1", "LT", "MLB" |
| assignment_type | Enum | route, block, blitz, coverage, spy |
| route_type | String? | "corner", "slant", "dig" (if route) |
| block_type | String? | "drive", "pull", "pass_pro" (if block) |
| read_order | Int? | QB read progression (1, 2, 3...) |
| description | String? | Free-text coaching point |

### GamePlan

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| org_id | UUID | FK → Organization |
| name | String | "Week 8 vs Eagles" |
| week | Int? | |
| opponent | String? | |
| is_active | Boolean | Only one active per org |
| created_by | UUID | FK → User |
| created_at | DateTime | |

### GamePlanPlay

Ordered junction: GamePlan ↔ Play.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| game_plan_id | UUID | FK → GamePlan |
| play_id | UUID | FK → Play |
| sort_order | Int | Display ordering |
| situation_note | String? | Game-plan-specific note |

### Quiz

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| org_id | UUID | FK → Organization |
| name | String | "Red Zone Package Quiz" |
| game_plan_id | UUID? | FK → GamePlan (optional link) |
| due_date | DateTime? | |
| created_by | UUID | FK → User |
| created_at | DateTime | |

### QuizQuestion

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| quiz_id | UUID | FK → Quiz |
| play_id | UUID | FK → Play |
| question_type | Enum | multiple_choice, tap_field, identify_route, situation_match, assignment_recall |
| question_text | String | "What is the QB's second read?" |
| options | JSON? | For multiple choice: [{text, correct}] |
| correct_zone | JSON? | For tap_field: {x, y, radius} |
| correct_answer | String? | For text-based answers |
| sort_order | Int | |

### QuizAttempt

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| quiz_id | UUID | FK → Quiz |
| user_id | UUID | FK → User (player) |
| score | Float | 0.0 - 1.0 |
| answers | JSON | [{question_id, answer, correct}] |
| started_at | DateTime | |
| completed_at | DateTime? | |

### PlayerProgress

Per-player, per-play learning state.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → User (player) |
| play_id | UUID | FK → Play |
| views | Int | Total view count |
| time_spent_sec | Int | Cumulative seconds viewing |
| last_viewed_at | DateTime? | |
| mastery_level | Enum | new, learning, reviewing, mastered |
| ease_factor | Float | SM-2 ease factor (default 2.5) |
| interval_days | Float | Current review interval |
| next_review_at | DateTime | When this play is due for review |
| quiz_scores | Float[] | History of quiz scores for this play |

---

## User Roles & Permissions

| Capability | Owner | Coach/Coordinator | Player |
|------------|-------|-------------------|--------|
| Create/edit plays | Yes | Yes | No |
| Manage playbooks | Yes | Yes | No |
| View plays | All | All | Assigned only |
| Take quizzes | No | No | Yes |
| View analytics | All players | Position group | Own progress |
| Manage members | Yes | No | No |
| Create quizzes | Yes | Yes | No |
| Manage game plans | Yes | Yes | No |
| Organization settings | Yes | No | No |

**Coordinator scoping:** Coordinators have `position_group` set. They see and manage only plays/playbooks/analytics for their side of the ball.

**Player onboarding:** Coach generates an invite code. Player enters code + creates account. Auto-assigned to the organization as a player.

---

## Core Pages

### Coach Pages (Desktop-Optimized, Sidebar Navigation)

1. **Dashboard** — Stats cards (total plays, weekly install completion, avg quiz score, player engagement). Recent plays grid. Active game plan summary. Alerts for inactive players.

2. **Playbooks** — List of playbooks with play count, side (O/D/ST). Click into a playbook to see plays in grid or list view. Filter by formation, play type, situation tags. Bulk operations (move, copy, delete).

3. **Game Plans** — Create weekly game plans by pulling plays from playbooks. Drag to reorder. Add situation notes per play. Mark as active to push to players. Track install progress in real time.

4. **Play Designer** — Full-screen canvas experience. Formation templates on the left. Player nodes on the field. Route drawing tools. Assignment panel on the right. Animation timeline at the bottom. Preview/playback controls. Save to playbook.

5. **Roster** — Player list with position, role, last active, study stats. Invite new players (generate code or send email). Assign position groups. Remove players.

6. **Quizzes** — Create quizzes manually or auto-generate from a game plan. Set due dates. View completion rates and scores per player. Drill into individual responses.

7. **Analytics** — Team heatmap (players × plays, color by mastery). Install tracker for active game plan. Position group breakdowns. Leaderboard. Export to CSV.

8. **Settings** — Organization name, logo, tier. Invite code management. Danger zone (delete org).

### Player Pages (Mobile-First, Bottom Tab Navigation)

1. **Home** — Personalized study feed. Due-for-review plays (spaced repetition). New quiz notifications. Weekly progress bar. Active game plan card.

2. **Plays** — Browse assigned plays by playbook or game plan. Search/filter. Tap into play detail: animated field diagram with play/pause, tabs for Overview / My Assignment / Film. Swipe between plays.

3. **Quiz** — Available quizzes with due dates. Take quiz flow: question → answer → feedback → next. Results summary at end. Retake option.

4. **Progress** — Personal dashboard. Mastery breakdown by formation/situation. Study streak. Time spent this week. Quiz score history. Comparison to position group average (anonymized).

---

## Play Designer — Canvas Engine

### Field Renderer
- Standard football field: yard lines every 5 yards, numbered every 10
- Hash marks, sidelines, end zones
- Configurable view: full field, red zone, half field
- Green field with white markings (classic look)
- Zoom and pan (scroll wheel on desktop, pinch on touch)

### Player Nodes
- 11 offensive or defensive player circles on the field
- Each labeled by position (WR1, LT, MLB, etc.)
- Color-coded by role: blue for offense, red for defense
- Draggable to reposition
- Click to select → opens assignment panel

### Route Drawing
- Click a player node to start drawing
- Click waypoints on the field — bezier curves auto-generate between points
- Route types auto-detected from shape (slant, out, corner, post, etc.) or manually tagged
- Arrowhead at the end of the route
- Different line styles: solid for routes, dashed for option routes, thick for blocking

### Animation System
- Each player has a timeline of keyframes
- Keyframe = position on field + timing (e.g., "at 1.2 seconds, WR1 is at this point on his route")
- Playback: all players move simultaneously along their paths
- Controls: play, pause, step forward, step back, speed (0.5x, 1x, 2x)
- QB read progression highlighted during playback (numbered indicators appear in sequence)
- Ball flight animation on pass plays

### Formation Templates
- Pre-built templates: I-Form, Shotgun, Singleback, Pistol, Empty, 3-4, 4-3, Nickel, Dime, etc.
- Coach can save custom formations as templates
- Selecting a template pre-positions all 11 players

### Serialization
- Canvas state serialized to JSON for storage
- Format: `{ players: [{id, position, x, y, assignments: [...]}], routes: [{playerId, waypoints: [{x, y}], type}], meta: {formation, playType} }`
- Animation data: `{ keyframes: [{playerId, time, x, y}], duration, ballFlight: {from, to, time} }`
- Auto-generate thumbnail PNG on save for play cards

---

## Learning System

### Spaced Repetition (SM-2 Algorithm)

Based on the SM-2 algorithm used by Anki:

1. After a player views a play or completes a quiz on it, rate the response quality (0-5):
   - Quiz score maps to quality: 0-59% → 0-2, 60-79% → 3, 80-94% → 4, 95-100% → 5
   - Viewing without quiz counts as quality 3 (neutral)
2. Update ease factor: `EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))`
3. Calculate next interval:
   - First review: 1 day
   - Second review: 3 days
   - Subsequent: `interval * EF`
4. Set `next_review_at = now + interval`

Mastery levels derived from interval:
- **New** — never viewed
- **Learning** — interval < 3 days
- **Reviewing** — interval 3-21 days
- **Mastered** — interval > 21 days

### Quiz Types

1. **Multiple Choice** — Standard 4-option question about a play. Auto-generated from play metadata or manually created.

2. **Tap the Field** — Show formation on the field canvas. Player taps where they should be or where their route goes. Correct if within radius of the target zone.

3. **Identify the Route** — Animate a play. Ask "What route is [position] running?" Player selects from route type options.

4. **Situation Match** — Present a down-and-distance situation. Player picks the correct play from 4 options. Tests game plan recall.

5. **Assignment Recall** — Show play name and formation. Player selects or types their specific assignment from memory. Tests individual accountability.

### Auto-Quiz Generation

Coaches can auto-generate a quiz from any playbook or game plan:
- System creates one question per play
- Question type selected based on play characteristics (pass plays get route ID questions, run plays get assignment recall)
- Coach can review and edit before publishing

---

## Analytics

### Coach Analytics Dashboard

**Team Heatmap:**
- Grid: rows = players, columns = plays in active game plan
- Cell color: red (not viewed), yellow (viewed, low quiz score), green (mastered)
- Click a cell to see detail (views, quiz scores, time spent)

**Install Tracker:**
- Active game plan plays listed with per-play completion percentage
- "Completion" = viewed + passed quiz above threshold (configurable, default 70%)
- Real-time updates as players study

**Position Group View:**
- Filter all analytics by position group
- Average mastery per group
- Identify weakest plays per group

**Alerts:**
- Players who haven't opened the app in X days
- Players with failing quiz scores on game plan plays
- Plays with low overall comprehension

**Leaderboard:**
- Ranked by: study time, quiz average, streak length, plays mastered
- Anonymized comparison available to players

### Player Analytics

- Personal mastery breakdown (pie chart by mastery level)
- Study streak (consecutive days with activity)
- Time spent this week vs. team average
- Quiz score trend over time
- Weakest plays (lowest mastery, longest overdue)

---

## AI Features

### Play Description → Diagram
- Coach types a natural language description: "Play action bootleg right, corner route to the X, flat route to the RB"
- AI parses the description and generates canvas_data JSON
- Places players in appropriate formation, draws routes described
- Coach can edit the generated diagram as a starting point
- Uses OpenAI API (GPT-4) or Anthropic API (Claude) — configurable

### Smart Tagging
- After a play is saved, AI analyzes the formation, routes, and play type
- Suggests situation tags: "red zone," "3rd & long," "2-minute drill"
- Coach confirms or dismisses suggestions

### Study Recommendations
- Based on PlayerProgress data, AI generates a prioritized study list
- "You scored 50% on Cover 3 recognition — review these 3 plays"
- Surfaced in the player home feed

### Play Similarity
- When viewing a play, AI identifies similar plays in the playbook
- "This is similar to Y-Cross but with a different backside concept"
- Helps players connect related concepts and understand scheme principles

---

## Responsive Design

### Breakpoints

| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 640px | Phone | Bottom tab nav, single column, stacked cards |
| 640-1024px | Tablet | Collapsible sidebar, 2-column where useful |
| > 1024px | Desktop | Fixed sidebar, multi-column layouts, full designer |

### Mobile-Specific Adaptations
- Play designer is view-only on phone (pinch-zoom, tap for details, animation playback)
- Play designer is limited-edit on tablet (reposition players, basic route edits)
- Full editing on desktop only
- Bottom sheet modals instead of side panels on mobile
- Swipe gestures for navigating between plays
- Pull-to-refresh on feeds

### Offline / PWA
- Service worker caches active game plan plays
- Players can download a game plan for offline study
- Quiz attempts sync when back online
- Add-to-homescreen prompt for mobile players

---

## Authentication & Onboarding

### Auth Flows
- **Email + Magic Link** (primary) — no passwords to remember, great for players
- **Google OAuth** — one-click for those who prefer it
- **Email + Password** — fallback option

### Onboarding: Coach
1. Sign up → Create organization (name, tier, logo)
2. Land on empty dashboard with guided prompts
3. "Create your first playbook" → "Add your first play" → "Invite your players"

### Onboarding: Player
1. Receive invite code from coach (text, whiteboard, handout)
2. Go to PlayForge → "Join a Team" → enter code
3. Create account (name, email, magic link)
4. Set position → land on home feed with assigned plays

---

## Tech Specifications

### Performance Targets
- First Contentful Paint < 1.5s
- Canvas render at 60fps on mid-range devices
- Play load time < 500ms
- Offline-capable within 2 taps of opening the app

### Security
- Row-level security: players can only access their org's data
- Invite codes are single-use or time-limited (configurable)
- Canvas data validated server-side before storage
- Rate limiting on API routes
- CSRF protection via NextAuth

### Testing Strategy
- Unit tests for canvas engine (serialization, animation math, SM-2 algorithm)
- Integration tests for API routes (Prisma + test database)
- E2E tests for critical flows (create play, take quiz, view analytics)
- Visual regression tests for canvas rendering
