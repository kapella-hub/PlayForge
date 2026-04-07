<p align="center">
  <h1 align="center">PlayForge</h1>
  <p align="center"><strong>Interactive Football Playbook Platform</strong></p>
  <p align="center">
    Build, animate, and share football plays. Help your team learn with quizzes and spaced repetition.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AI-Claude-cc785c?logo=anthropic" alt="Claude AI" />
  <img src="https://img.shields.io/badge/PWA-Ready-5a0fc8" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Screenshots

<!-- Screenshot: Play Designer — full-width canvas with Konva.js field rendering, player nodes, route lines, formation picker sidebar, and floating toolbar -->

<!-- Screenshot: Coach Dashboard — stat cards showing install completion, quiz averages, and player activity; mastery heatmap and leaderboard -->

<!-- Screenshot: Player View — play card grid with mastery badges, spaced repetition review queue, and quiz interface -->

<!-- Screenshot: Game Plan Builder — ordered play list with drag-to-reorder, situation tags, and opponent/week metadata -->

<!-- Screenshot: Analytics — install tracker per play, position-group leaderboard, and inactive player alerts -->

---

## Features

### Play Designer
- **Canvas engine** built on Konva.js with a realistic football field (yard lines, hash marks, end zones)
- **Route drawing** with click-to-place waypoints and auto-detected route types (Go, Slant, Post, Curl, etc.)
- **40+ route templates** across short, medium, deep, screen, and blocking categories
- **20+ pre-built formations** for offense (Shotgun, I-Form, Pistol, Empty, Trips) and defense (4-3, 3-4, Nickel, Dime)
- **Play animation** with keyframe interpolation, ball flight arcs, QB read progression indicators, and ghost trails
- **AI play generation** powered by Claude -- describe a play in natural language and get a complete diagram
- **Play mirroring** flips any play horizontally across the field center
- **Coverage overlays** for Cover 0, 1, 2, 3, and 4 (Quarters) with labeled zone regions
- **Pre-snap motion arrows** to diagram player motion before the snap
- **Export to PNG** at 2x resolution for print and presentation
- **Print layout** with playbook sheet and wristband card modes
- **Version history** with automatic snapshots on every save and one-click restore
- **30+ play templates** organized by category (Quick Game, Play Action, Deep Shots, Run Game, Screens, Red Zone)

### Learning System
- **Spaced repetition** using the SM-2 algorithm -- plays are scheduled for review based on mastery
- **Mastery levels**: New Play -> Learning -> Reviewing -> Mastered (driven by review intervals)
- **Quizzes** with multiple question types: multiple choice, tap-field, identify-route, situation-match, assignment-recall
- **Player-specific view** showing only plays assigned via the active game plan
- **Gamification** with XP, levels (Rookie through MVP), 10 badges, and streak tracking
- **Leaderboard** with composite scoring (40% mastery, 30% quiz avg, 20% study time, 10% streak)

### Coach Tools
- **Analytics dashboard** with install completion tracking, average quiz scores, and inactive player detection
- **Game plans** with ordered play lists, week/opponent metadata, and active plan designation
- **Practice plans** with named periods, duration tracking, play assignment per period, and drag-to-reorder
- **Roster management** with role assignment (owner, coach, coordinator, player), position tracking, and member removal
- **Playbook sharing** between organizations via slug or invite code, with import/revoke controls
- **QR code invites** for player onboarding -- scan to join a team
- **Notification system** with alerts for inactive players, low quiz scores, install progress, and due reviews

### Platform
- **Dark and light themes** with system preference detection
- **PWA-ready** with web app manifest, standalone display mode, and mobile-optimized layout
- **Responsive design** with Tailwind CSS 4
- **Authentication** via NextAuth v5 with Google OAuth and dev-mode credentials
- **Game formats** from 4v4 flag football through full 11v11

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.9.0 (22+ recommended)
- **PostgreSQL** 14+ running locally or via Docker
- **npm** (ships with Node.js)

### 1. Clone the repository

```bash
git clone <repository-url> playforge
cd playforge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/playforge"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

Generate a secret:

```bash
openssl rand -base64 32
```

### 4. Set up the database

```bash
npx prisma migrate dev
```

### 5. Seed sample data

```bash
npm run db:seed
```

This creates a sample organization ("Lincoln High Varsity") with a coach, three players, a playbook with four plays, a game plan, and a quiz.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Sign in with seed accounts

In development mode, a credentials provider is available (no password required):

| Role    | Email                    | Notes                    |
|---------|--------------------------|--------------------------|
| Coach   | `coach@playforge.dev`    | Owner of Lincoln High    |
| Player  | `marcus@playforge.dev`   | WR                       |
| Player  | `jaylen@playforge.dev`   | QB                       |
| Player  | `devon@playforge.dev`    | RB                       |

Invite code for joining: **`PLAY01`**

---

## Tech Stack

| Layer         | Technology                                          |
|---------------|-----------------------------------------------------|
| Framework     | Next.js 16 (App Router, Server Actions)             |
| UI            | React 19, Tailwind CSS 4, Framer Motion             |
| Canvas        | Konva.js + react-konva                               |
| Database      | PostgreSQL via Prisma 7 (with `@prisma/adapter-pg`) |
| Auth          | NextAuth v5 (Google OAuth, dev credentials)         |
| AI            | Anthropic Claude (play generation)                  |
| QR Codes      | qrcode (invite links)                               |
| Icons         | Lucide React                                        |
| Testing       | Vitest, Testing Library, jsdom                      |
| Linting       | ESLint 9 (eslint-config-next)                       |
| Language      | TypeScript 5                                        |

---

## Project Structure

```
src/
  app/
    (auth)/              # Auth pages: login, signup, join (invite code)
    (coach)/             # Coach route group (sidebar layout)
      analytics/         # Team analytics dashboard
      dashboard/         # Coach home with stats + notifications
      designer/          # Play designer canvas page
      game-plans/        # Game plan list + detail views
      playbooks/         # Playbook list + detail (play grid)
      practice/          # Practice plan list + period editor
      quizzes/           # Quiz list + creation wizard
      roster/            # Team roster management
      settings/          # Org settings + file management
    (player)/            # Player route group (tab layout)
      home/              # Player dashboard with due reviews + badges
      plays/             # Play list + individual play viewer
      progress/          # Personal mastery progress view
      quiz/              # Quiz list + quiz flow
    api/
      ai/generate-play/  # POST — AI play generation endpoint
      auth/              # NextAuth routes + signup/join/verify-invite
  components/
    analytics/           # Stat cards, heatmap, leaderboard, install tracker
    dashboard/           # Coach dashboard client component
    game-plan/           # Game plan play list
    layout/              # Coach sidebar, player tabs, user menu
    play/                # Play card, toolbar, formation picker, route picker,
                         #   AI generator, animation controls, assignment panel,
                         #   play library, film link, version history, print,
                         #   share playbook, filters, viewer
    player/              # Player home client component
    quiz/                # Quiz card, quiz flow, multiple choice
    roster/              # Invite code card with QR generation
    ui/                  # Badge, button, card, dropdown, input, select,
                         #   skeleton, spinner, toast, theme toggle, notification bell
  engine/
    animation-engine.ts  # Keyframe generation, interpolation, ball flight, read order
    ball.tsx             # Animated football sprite
    constants.ts         # Field dimensions, colors, formations, game formats, route detection
    coverage-zone.tsx    # Coverage scheme overlays (Cover 0-4)
    export.ts            # PNG export at 2x resolution
    field-renderer.tsx   # Konva field background (grass, lines, hash marks, end zones)
    mirror.ts            # Horizontal play mirroring
    motion-arrow.tsx     # Pre-snap motion path rendering
    play-canvas.tsx      # Main interactive canvas component
    player-node.tsx      # Draggable player circle with label
    plays-library.ts     # 30+ pre-built play templates
    read-indicator.tsx   # QB read progression number bubbles
    route-line.tsx       # Route path rendering with arrowheads
    routes-library.ts    # 40+ route templates with offset waypoints
    serialization.ts     # Canvas/animation data serialization + backward compat
    types.ts             # CanvasPlayer, Route, MotionPath, AnimationData types
  lib/
    actions/             # Server actions (see API Routes below)
    ai/play-generator.ts # Claude AI integration for play generation
    auth.ts              # NextAuth configuration
    db.ts                # Prisma client singleton
    film-utils.ts        # Film timestamp formatting
    gamification.ts      # XP, levels, badges system
    membership.ts        # Org membership helpers
    notifications.ts     # Coach/player notification generation
    qr.ts                # QR code generation for invite links
    spaced-repetition/
      sm2.ts             # SM-2 algorithm implementation
    use-keyboard-shortcuts.ts  # React hook for keyboard bindings
    utils.ts             # Shared utilities (cn, invite code generation)
  types/
    index.ts             # Shared app types
    next-auth.d.ts       # NextAuth type augmentation
prisma/
  schema.prisma          # Database schema (16 models)
  seed.ts                # Sample data seeder
```

---

## Environment Variables

| Variable               | Required | Default              | Description                                    |
|------------------------|----------|----------------------|------------------------------------------------|
| `DATABASE_URL`         | Yes      | --                   | PostgreSQL connection string                   |
| `NEXTAUTH_URL`         | Yes      | --                   | Application base URL                           |
| `NEXTAUTH_SECRET`      | Yes      | --                   | Secret for signing session tokens              |
| `GOOGLE_CLIENT_ID`     | No       | --                   | Google OAuth client ID                         |
| `GOOGLE_CLIENT_SECRET` | No       | --                   | Google OAuth client secret                     |
| `ANTHROPIC_API_KEY`    | No       | --                   | Anthropic API key for AI play generation       |
| `EMAIL_SERVER_HOST`    | No       | --                   | SMTP host for magic link emails                |
| `EMAIL_SERVER_PORT`    | No       | --                   | SMTP port                                      |
| `EMAIL_SERVER_USER`    | No       | --                   | SMTP username                                  |
| `EMAIL_SERVER_PASSWORD`| No       | --                   | SMTP password                                  |
| `EMAIL_FROM`           | No       | --                   | Sender email address                           |

**Note:** In development mode (`NODE_ENV !== "production"`), a dev credentials provider is automatically enabled. This allows sign-in with just an email (no password) against seeded users. This provider is disabled in production.

---

## Database

PlayForge uses PostgreSQL with Prisma ORM. The schema defines 16 models:

| Model              | Description                                                 |
|--------------------|-------------------------------------------------------------|
| `User`             | Application users (coaches and players)                     |
| `Account`          | OAuth provider accounts (NextAuth)                          |
| `Session`          | Active sessions (NextAuth)                                  |
| `VerificationToken`| Email verification tokens (NextAuth)                        |
| `Organization`     | Teams/programs with name, tier (youth/HS/college/pro), invite code |
| `Membership`       | User-to-org relationship with role and position             |
| `Playbook`         | Collection of plays (offense/defense/special teams)         |
| `Play`             | Individual play with canvas data, animation data, tags      |
| `PlayAssignment`   | Per-position assignments within a play                      |
| `PlayVersion`      | Historical snapshots of play canvas data                    |
| `GamePlan`         | Weekly game plan with ordered plays and opponent info        |
| `GamePlanPlay`     | Join table linking plays to game plans with sort order       |
| `Quiz`             | Assessment linked to a game plan with due date              |
| `QuizQuestion`     | Questions with multiple types and correct answers           |
| `QuizAttempt`      | Player quiz submission with score and answers               |
| `PlayerProgress`   | Per-player, per-play mastery tracking with SM-2 state       |
| `PracticePlan`     | Practice schedule with periods and play assignments         |
| `PracticePeriod`   | Individual practice period with duration and linked plays   |
| `PlaybookShare`    | Cross-organization playbook sharing records                 |

Key enums: `Tier` (youth, high_school, college, pro), `MemberRole` (owner, coach, coordinator, player), `Side` (offense, defense, special_teams), `PlayType` (run, pass, play_action, screen, special), `QuestionType` (multiple_choice, tap_field, identify_route, situation_match, assignment_recall), `MasteryLevel` (new_play, learning, reviewing, mastered).

---

## Keyboard Shortcuts

All shortcuts are active on the Play Designer page. Shortcuts marked with "ignores inputs" do not fire when focus is in a text field.

| Shortcut           | Action                          | Context           |
|--------------------|---------------------------------|-------------------|
| `D`                | Toggle route drawing mode       | Ignores inputs    |
| `V`                | Switch to select mode           | Ignores inputs    |
| `M`                | Toggle pre-snap motion mode     | Ignores inputs    |
| `H`                | Mirror play horizontally        | Ignores inputs    |
| `A`                | Toggle AI generator panel       | Ignores inputs    |
| `F`                | Toggle formation picker         | Ignores inputs    |
| `R`                | Toggle route picker (when player selected) | Ignores inputs |
| `L`                | Toggle play library             | Ignores inputs    |
| `P`                | Toggle animation preview        | Ignores inputs    |
| `Escape`           | Close panel / exit mode / deselect | Ignores inputs |
| `Backspace`        | Delete selected player's route  | Ignores inputs    |
| `Delete`           | Delete selected player's route  | Ignores inputs    |
| `Cmd/Ctrl + Z`     | Undo                            | Global            |
| `Cmd/Ctrl + Shift + Z` | Redo                       | Global            |
| `Cmd/Ctrl + S`     | Save play                       | Global            |
| `Enter`            | Finish drawing current route    | During route draw |
| `Right-click`      | Undo last waypoint              | During route draw |
| `Double-click`     | Finish current route            | During route draw |

---

## API Routes

### REST Endpoints

| Method | Path                          | Auth     | Description                         |
|--------|-------------------------------|----------|-------------------------------------|
| `GET`  | `/api/auth/[...nextauth]`     | Public   | NextAuth handler (sign in/out/session) |
| `POST` | `/api/auth/signup`            | Public   | Create user + organization          |
| `POST` | `/api/auth/join`              | Public   | Join organization via invite code   |
| `GET`  | `/api/auth/verify-invite?code=` | Public | Verify invite code, return org name |
| `POST` | `/api/ai/generate-play`       | Auth     | AI play generation from description |

### Server Actions

PlayForge uses Next.js Server Actions for all data mutations. Each action requires authentication unless noted.

**Plays** (`src/lib/actions/play-actions.ts`)
- `getPlay(id)` -- Fetch a play with assignments and playbook
- `getPlaysByPlaybook(playbookId)` -- List plays in a playbook
- `getPlaysByOrg(orgId)` -- List all plays in an organization (id, name, formation, type, thumbnail)
- `createPlay({playbookId, name, formation, playType, canvasData?, animationData?, notes?})` -- Create a new play
- `updatePlay(id, data)` -- Update play (auto-creates a version snapshot before saving)
- `deletePlay(id, playbookId)` -- Delete a play
- `duplicatePlay(playId, newName?)` -- Duplicate a play within the same playbook
- `mirrorPlayAction(playId)` -- Create a horizontally mirrored copy
- `getPlayVersions(playId)` -- List version history for a play
- `restorePlayVersion(playId, versionId)` -- Restore a previous version (snapshots current state first)

**Playbooks** (`src/lib/actions/playbook-actions.ts`)
- `getPlaybooks(orgId)` -- List playbooks with play counts
- `createPlaybook(formData)` -- Create a playbook (FormData: orgId, name, description, side, visibility)
- `deletePlaybook(id)` -- Delete a playbook and all its plays
- `sharePlaybook(playbookId, targetSlug)` -- Share a playbook with another organization
- `getSharedPlaybooks(orgId)` -- List playbooks shared with an org
- `revokePlaybookShare(shareId)` -- Revoke a share
- `importSharedPlaybook(shareId)` -- Copy a shared playbook into your org

**Game Plans** (`src/lib/actions/game-plan-actions.ts`)
- `getGamePlans(orgId)` -- List game plans with play counts
- `getGamePlan(id)` -- Fetch a game plan with ordered plays
- `getActiveGamePlan(orgId)` -- Fetch the currently active game plan
- `createGamePlan({orgId, name, week?, opponent?})` -- Create a game plan
- `setActiveGamePlan(orgId, gamePlanId)` -- Set a game plan as active (deactivates others)
- `addPlayToGamePlan(gamePlanId, playId)` -- Add a play to a game plan
- `removePlayFromGamePlan(gamePlanId, playId)` -- Remove a play
- `reorderGamePlanPlays(gamePlanId, playIds)` -- Reorder plays by ID array
- `deleteGamePlan(id)` -- Delete a game plan

**Quizzes** (`src/lib/actions/quiz-actions.ts`)
- `getQuizzes(orgId)` -- List quizzes with question/attempt counts
- `getQuiz(id)` -- Fetch quiz with questions and play info
- `getPlayerQuizzes(orgId)` -- List quizzes for the player view
- `createQuiz({orgId, name, gamePlanId?, dueDate?})` -- Create a quiz
- `addQuizQuestion({quizId, playId, questionType, questionText, options?, correctZone?, correctAnswer?, sortOrder})` -- Add a question
- `submitQuizAttempt({quizId, answers})` -- Submit answers and update player progress per play
- `getQuizAttempts(quizId, userId)` -- Fetch a player's attempts

**Progress** (`src/lib/actions/progress-actions.ts`)
- `recordPlayView(playId)` -- Record a play view and update SM-2 review schedule
- `recordQuizScore(playId, score)` -- Update progress based on quiz performance
- `getPlayerProgress(userId)` -- Get all progress entries for a player
- `getDueForReview(userId)` -- Get plays due for review (limit 10)

**Analytics** (`src/lib/actions/analytics-actions.ts`)
- `getTeamAnalytics(orgId)` -- Aggregate team stats (install %, quiz avg, mastery, inactive players)
- `getInstallProgress(orgId)` -- Per-play install progress (viewed count, quiz passed count)
- `getLeaderboard(orgId, positionGroup?)` -- Ranked player list with composite scores
- `getPlayerRank(orgId, userId)` -- Individual rank and score

**Roster** (`src/lib/actions/roster-actions.ts`)
- `getRoster(orgId)` -- List members with progress data
- `removeMember(membershipId)` -- Remove a member (coach/owner only)
- `updateMemberPosition(membershipId, position)` -- Update position
- `updateMemberRole(membershipId, role)` -- Change role (owner only)
- `regenerateInviteCode(orgId)` -- Generate new invite code (coach/owner only)
- `getOrganization(orgId)` -- Fetch org details

**Practice Plans** (`src/lib/actions/practice-actions.ts`)
- `getPracticePlans(orgId)` -- List practice plans with period counts and total duration
- `getPracticePlan(id)` -- Fetch plan with ordered periods
- `createPracticePlan({orgId, name, date?, notes?})` -- Create a plan
- `updatePracticePlan(id, data)` -- Update plan metadata
- `deletePracticePlan(id)` -- Delete a plan
- `addPracticePeriod({practicePlanId, name, durationMin, playIds?, notes?})` -- Add a period
- `updatePracticePeriod(id, data)` -- Update a period
- `deletePracticePeriod(id)` -- Delete a period
- `reorderPracticePeriods(planId, periodIds)` -- Reorder periods

---

## Game Formats

PlayForge supports formations for multiple game sizes. The game format selector in the designer filters formations to the appropriate player count.

| Format  | Players | Use Case                     |
|---------|---------|------------------------------|
| 4v4     | 4       | Youth flag football          |
| 5v5     | 5       | Flag football                |
| 6v6     | 6       | 6-man football / flag        |
| 7v7     | 7       | 7-on-7 passing tournaments   |
| 8v8     | 8       | 8-man football               |
| 9v9     | 9       | 9-man football               |
| 11v11   | 11      | Standard tackle football     |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run tests: `npm run test:run`
4. Run linting: `npm run lint`
5. Commit your changes
6. Open a pull request

### Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest in watch mode
npm run test:run     # Run Vitest once
npm run db:seed      # Seed the database with sample data
```

### Database Commands

```bash
npx prisma migrate dev        # Run pending migrations
npx prisma migrate reset      # Reset database and re-run all migrations + seed
npx prisma studio             # Open Prisma Studio (database GUI)
npx prisma generate           # Regenerate Prisma client after schema changes
```

---

## License

MIT
