# API Reference

PlayForge uses two patterns for client-server communication:

1. **REST API routes** under `src/app/api/` -- for auth flows and the AI endpoint
2. **Next.js Server Actions** under `src/lib/actions/` -- for all data mutations and queries

All server actions require authentication (via `auth()`) unless explicitly noted. Unauthenticated requests redirect to `/login` or throw `"Unauthorized"`.

---

## REST API Routes

### `POST /api/ai/generate-play`

Generate a play diagram from a natural language description using Claude AI.

**Auth:** Required (session cookie)

**Request Body:**

```json
{
  "description": "Four verticals with the RB on a checkdown",
  "side": "offense",
  "formation": "shotgun-2x2",
  "gameFormat": "11v11"
}
```

| Field         | Type   | Required | Description                               |
|---------------|--------|----------|-------------------------------------------|
| `description` | string | Yes      | Natural language play description          |
| `side`        | string | No       | `"offense"` or `"defense"`                |
| `formation`   | string | No       | Formation template ID (e.g., `"shotgun-2x2"`) |
| `gameFormat`  | string | No       | Game format (e.g., `"7v7"`, `"11v11"`)    |

**Response (200):**

```json
{
  "canvasData": {
    "players": [
      { "id": "qb", "label": "QB", "x": 500, "y": 420, "side": "offense" }
    ],
    "routes": [
      {
        "playerId": "wr1",
        "waypoints": [{ "x": 150, "y": 350 }, { "x": 150, "y": 190 }],
        "type": "solid",
        "routeType": "Go"
      }
    ],
    "motions": [],
    "meta": {
      "formation": "shotgun-2x2",
      "playType": "pass",
      "side": "offense"
    }
  }
}
```

**Error Responses:**

| Status | Body                                      | Condition                  |
|--------|-------------------------------------------|----------------------------|
| 400    | `{ "error": "Description is required" }`  | Empty or missing description |
| 401    | `{ "error": "Unauthorized" }`             | No valid session            |
| 500    | `{ "error": "AI returned invalid play data..." }` | Claude returned unparseable JSON |
| 503    | `{ "error": "ANTHROPIC_API_KEY is not set..." }` | Missing API key in environment |

---

### `POST /api/auth/signup`

Create a new user and organization.

**Auth:** None

**Request Body:**

```json
{
  "name": "Coach Smith",
  "email": "coach@example.com",
  "orgName": "West High Football"
}
```

| Field    | Type   | Required | Description              |
|----------|--------|----------|--------------------------|
| `name`   | string | Yes      | User display name        |
| `email`  | string | Yes      | User email (must be unique) |
| `orgName`| string | Yes      | Organization name         |

**Response (201):**

```json
{
  "userId": "cuid_abc123",
  "orgId": "cuid_def456"
}
```

**Side effects:**
- Creates `User` record
- Creates `Organization` with auto-generated slug (`orgname-<userid-prefix>`) and invite code
- Creates `Membership` with role `owner`

**Error Responses:**

| Status | Body                                   | Condition                  |
|--------|----------------------------------------|----------------------------|
| 400    | `{ "error": "Missing required fields" }` | Missing name, email, or orgName |
| 400    | `{ "error": "Invalid email format" }`  | Email fails regex validation |
| 409    | `{ "error": "Email already registered" }` | Email exists in database  |
| 500    | `{ "error": "Internal server error" }` | Database or server failure |

---

### `POST /api/auth/join`

Join an existing organization using an invite code.

**Auth:** None

**Request Body:**

```json
{
  "name": "Marcus Williams",
  "email": "marcus@example.com",
  "position": "WR",
  "inviteCode": "PLAY01"
}
```

| Field       | Type   | Required | Description                      |
|-------------|--------|----------|----------------------------------|
| `name`      | string | Yes      | User display name                |
| `email`     | string | Yes      | User email                       |
| `position`  | string | Yes      | Playing position (e.g., "QB", "WR") |
| `inviteCode`| string | Yes      | Organization invite code (case-insensitive) |

**Response (201):**

```json
{
  "userId": "cuid_abc123",
  "orgId": "cuid_def456"
}
```

**Side effects:**
- Upserts `User` (creates if new, no-ops if existing)
- Creates `Membership` with role `player` and the given position

**Error Responses:**

| Status | Body                                       | Condition                    |
|--------|--------------------------------------------|-------------------------------|
| 400    | `{ "error": "Missing required fields" }`   | Missing any required field    |
| 404    | `{ "error": "Invalid invite code" }`       | No org matches the code       |
| 409    | `{ "error": "Already a member of this team" }` | User already has a membership |
| 500    | `{ "error": "Internal server error" }`     | Database or server failure    |

---

### `GET /api/auth/verify-invite`

Verify an invite code and return the organization name.

**Auth:** None

**Query Parameters:**

| Param | Type   | Required | Description                     |
|-------|--------|----------|---------------------------------|
| `code`| string | Yes      | Invite code (case-insensitive)  |

**Response (200):**

```json
{
  "orgName": "Lincoln High Varsity"
}
```

**Error Responses:**

| Status | Body                                    | Condition               |
|--------|-----------------------------------------|--------------------------|
| 400    | `{ "error": "Missing invite code" }`   | No `code` param          |
| 404    | `{ "error": "Invalid invite code" }`   | No org matches the code  |

---

### `GET/POST /api/auth/[...nextauth]`

NextAuth catch-all handler. Manages OAuth flows, session tokens, and sign-out.

Refer to the [NextAuth documentation](https://authjs.dev/getting-started) for endpoint details.

---

## Server Actions

### Plays

**Source:** `src/lib/actions/play-actions.ts`

#### `getPlay(id: string)`
Fetch a single play with its assignments and playbook.
- **Returns:** `Play` with `assignments[]` and `playbook`, or `null`

#### `getPlaysByPlaybook(playbookId: string)`
List all plays in a playbook, newest first.
- **Returns:** `Play[]`

#### `getPlaysByOrg(orgId: string)`
List all plays across all playbooks in an org (lightweight: id, name, formation, playType, thumbnailUrl).
- **Returns:** `Pick<Play, "id" | "name" | "formation" | "playType" | "thumbnailUrl">[]`

#### `createPlay(data)`
Create a new play in a playbook.
- **Auth:** Required
- **Parameters:**

| Field          | Type     | Required | Description                    |
|----------------|----------|----------|--------------------------------|
| `playbookId`   | string   | Yes      | Target playbook                |
| `name`         | string   | Yes      | Play name                      |
| `formation`    | string   | Yes      | Formation name/ID              |
| `playType`     | PlayType | Yes      | `run`, `pass`, `play_action`, `screen`, `special` |
| `canvasData`   | JSON     | No       | Canvas data (defaults to `{}`) |
| `animationData`| JSON     | No       | Animation data (defaults to `{}`) |
| `notes`        | string   | No       | Coach notes                    |

- **Returns:** Created `Play`

#### `updatePlay(id: string, data)`
Update a play. Automatically creates a `PlayVersion` snapshot before saving.
- **Auth:** Required
- **Parameters:** Partial subset of `name`, `formation`, `playType`, `canvasData`, `animationData`, `notes`, `filmUrl`, `filmTimestamp`, `thumbnailUrl`, `situationTags`
- **Returns:** Updated `Play`

#### `deletePlay(id: string, playbookId: string)`
Delete a play and revalidate the playbook page.
- **Auth:** Required

#### `duplicatePlay(playId: string, newName?: string)`
Create a copy of a play in the same playbook.
- **Auth:** Required
- **Returns:** New `Play`

#### `mirrorPlayAction(playId: string)`
Create a horizontally mirrored copy of a play.
- **Auth:** Required
- **Returns:** New `Play` named `"<original> (Mirrored)"`

#### `getPlayVersions(playId: string)`
List all version snapshots for a play, newest first. Includes creator name/email.
- **Returns:** `PlayVersion[]` with `createdBy`

#### `restorePlayVersion(playId: string, versionId: string)`
Restore a play to a previous version. Creates a safety snapshot of the current state before restoring.
- **Auth:** Required
- **Returns:** Updated `Play`

---

### Playbooks

**Source:** `src/lib/actions/playbook-actions.ts`

#### `getPlaybooks(orgId: string)`
List playbooks with play counts.
- **Returns:** `Playbook[]` with `_count.plays`

#### `createPlaybook(formData: FormData)`
Create a new playbook.
- **Auth:** Required
- **FormData fields:** `orgId`, `name`, `description?`, `side` (default: `"offense"`), `visibility` (default: `"private"`)
- **Returns:** Created `Playbook`

#### `deletePlaybook(id: string)`
Delete a playbook and all its plays (cascade).
- **Auth:** Required

#### `sharePlaybook(playbookId: string, targetSlug: string)`
Share a playbook with another organization. Target is found by slug or invite code.
- **Auth:** Required
- **Returns:** `{ id: string, orgName: string }`
- **Errors:** Throws if target org not found, playbook not found, or sharing with own org

#### `getSharedPlaybooks(orgId: string)`
List playbooks shared with the given org, including playbook details and sharer info.
- **Returns:** `PlaybookShare[]` with nested `playbook` and `sharedBy`

#### `revokePlaybookShare(shareId: string)`
Revoke a playbook share.
- **Auth:** Required

#### `importSharedPlaybook(shareId: string)`
Deep-copy a shared playbook (with all plays) into your org.
- **Auth:** Required
- **Returns:** New `Playbook` named `"<original> (imported)"`

---

### Game Plans

**Source:** `src/lib/actions/game-plan-actions.ts`

#### `getGamePlans(orgId: string)`
List game plans with play counts.
- **Returns:** `GamePlan[]` with `_count.plays`

#### `getGamePlan(id: string)`
Fetch a game plan with ordered plays.
- **Returns:** `GamePlan` with `plays[].play`

#### `getActiveGamePlan(orgId: string)`
Fetch the currently active game plan with full play data.
- **Returns:** `GamePlan | null`

#### `createGamePlan(data)`
Create a new game plan.
- **Auth:** Required
- **Parameters:** `orgId`, `name`, `week?` (number), `opponent?` (string)
- **Returns:** Created `GamePlan`

#### `setActiveGamePlan(orgId: string, gamePlanId: string)`
Set one game plan as active, deactivating all others in the org.
- **Auth:** Required
- **Returns:** Updated `GamePlan`

#### `addPlayToGamePlan(gamePlanId: string, playId: string)`
Add a play to a game plan at the end of the order.
- **Auth:** Required
- **Returns:** Created `GamePlanPlay`

#### `removePlayFromGamePlan(gamePlanId: string, playId: string)`
Remove a play from a game plan.
- **Auth:** Required

#### `reorderGamePlanPlays(gamePlanId: string, playIds: string[])`
Set the play order based on array index position.
- **Auth:** Required

#### `deleteGamePlan(id: string)`
Delete a game plan and its play associations.
- **Auth:** Required

---

### Quizzes

**Source:** `src/lib/actions/quiz-actions.ts`

#### `getQuizzes(orgId: string)`
List quizzes with question/attempt counts and linked game plan name.
- **Returns:** `Quiz[]` with counts and `gamePlan.name`

#### `getQuiz(id: string)`
Fetch a quiz with ordered questions and play metadata.
- **Returns:** `Quiz` with `questions[].play`

#### `getPlayerQuizzes(orgId: string)`
List quizzes for the player view, ordered by due date.
- **Returns:** `Quiz[]` with `_count.questions` and `gamePlan.name`

#### `createQuiz(data)`
Create a new quiz.
- **Auth:** Required
- **Parameters:** `orgId`, `name`, `gamePlanId?`, `dueDate?` (Date)
- **Returns:** Created `Quiz`

#### `addQuizQuestion(data)`
Add a question to a quiz.
- **Parameters:**

| Field          | Type         | Required | Description                        |
|----------------|-------------|----------|--------------------------------------|
| `quizId`       | string       | Yes      | Target quiz                         |
| `playId`       | string       | Yes      | Associated play                     |
| `questionType` | QuestionType | Yes      | `multiple_choice`, `tap_field`, `identify_route`, `situation_match`, `assignment_recall` |
| `questionText` | string       | Yes      | Question prompt                     |
| `options`      | JSON         | No       | Answer options (for multiple choice) |
| `correctZone`  | JSON         | No       | Correct zone (for tap_field)        |
| `correctAnswer`| string       | No       | Correct answer string               |
| `sortOrder`    | number       | Yes      | Display order                       |

- **Returns:** Created `QuizQuestion`

#### `submitQuizAttempt(data)`
Submit quiz answers. Calculates score and updates per-play progress via SM-2.
- **Auth:** Required
- **Parameters:**

```typescript
{
  quizId: string;
  answers: { questionId: string; answer: string; correct: boolean }[];
}
```

- **Returns:** Created `QuizAttempt`
- **Side effects:** Calls `recordQuizScore()` for each play covered by the quiz

#### `getQuizAttempts(quizId: string, userId: string)`
Fetch a player's attempts for a quiz, newest first.
- **Returns:** `QuizAttempt[]`

---

### Progress

**Source:** `src/lib/actions/progress-actions.ts`

#### `recordPlayView(playId: string)`
Record that the authenticated user viewed a play. Updates SM-2 state with quality 3 (correct but with difficulty).
- **Auth:** Required
- **Returns:** Upserted `PlayerProgress`

#### `recordQuizScore(playId: string, score: number)`
Update a player's progress for a specific play based on a quiz score (0.0 to 1.0). Maps score to SM-2 quality and recalculates review schedule.
- **Auth:** Required
- **Returns:** Upserted `PlayerProgress`

#### `getPlayerProgress(userId: string)`
Get all progress entries for a user, ordered by next review date. Includes play and playbook data.
- **Returns:** `PlayerProgress[]` with `play.playbook`

#### `getDueForReview(userId: string)`
Get plays that are due for review (nextReviewAt <= now), limited to 10.
- **Returns:** `PlayerProgress[]` with `play`

---

### Analytics

**Source:** `src/lib/actions/analytics-actions.ts`

#### `getTeamAnalytics(orgId: string)`
Comprehensive team analytics including:
- Total plays and players
- Install completion percentage (players who viewed all active game plan plays)
- Average quiz score (from 20 most recent attempts)
- Per-player mastery data (progress on each game plan play)
- Inactive players (no activity in 3+ days)
- Active game plan name and plays

**Returns:**

```typescript
{
  totalPlays: number;
  totalPlayers: number;
  installCompletion: number;      // 0-100
  avgQuizScore: number;           // 0-100
  playerMasteryData: Array<{
    id: string;
    name: string;
    position: string;
    progress: Array<{ playId: string; masteryLevel: MasteryLevel; views: number }>;
    lastActive: Date | null;
  }>;
  inactivePlayers: Array<{ id: string; name: string; lastActive: Date | null }>;
  gamePlanName: string | null;
  gamePlanPlays: Array<{ id: string; name: string }>;
}
```

#### `getInstallProgress(orgId: string)`
Per-play installation progress showing how many players have viewed and quiz-passed each play.
- **Returns:** `{ gamePlanName, plays: Array<{ playId, playName, formation, viewedCount, quizPassedCount, totalPlayers }> }`

#### `getLeaderboard(orgId: string, positionGroup?: string)`
Ranked player list sorted by composite score. Supports filtering by position group.
- **Returns:** `LeaderboardEntry[]` (see Architecture docs for scoring formula)

#### `getPlayerRank(orgId: string, userId: string)`
Get a specific player's rank and composite score.
- **Returns:** `{ rank: number | null, total: number, compositeScore: number }`

---

### Roster

**Source:** `src/lib/actions/roster-actions.ts`

#### `getRoster(orgId: string)`
List all members with their user info and progress data.
- **Returns:** `Membership[]` with `user.playerProgress`

#### `removeMember(membershipId: string)`
Remove a member from the organization.
- **Auth:** Required (caller must be `owner` or `coach` in the same org)

#### `updateMemberPosition(membershipId: string, position: string)`
Update a member's playing position.

#### `updateMemberRole(membershipId: string, role: MemberRole)`
Change a member's role.
- **Auth:** Required (caller must be `owner`)
- **Valid roles:** `owner`, `coach`, `coordinator`, `player`

#### `regenerateInviteCode(orgId: string)`
Generate and set a new random invite code for the organization.
- **Auth:** Required (caller must be `owner` or `coach`)
- **Returns:** New invite code string

#### `getOrganization(orgId: string)`
Fetch organization details.
- **Returns:** `Organization | null`

---

### Practice Plans

**Source:** `src/lib/actions/practice-actions.ts`

#### `getPracticePlans(orgId: string)`
List practice plans with period counts and total duration.
- **Returns:** Plans enriched with `totalDuration` and `periodCount`

#### `getPracticePlan(id: string)`
Fetch a plan with ordered periods and creator info.
- **Returns:** `PracticePlan` with `periods[]` and `createdBy`

#### `createPracticePlan(data)`
Create a new practice plan.
- **Auth:** Required
- **Parameters:** `orgId`, `name`, `date?` (ISO string), `notes?`
- **Returns:** Created `PracticePlan`

#### `updatePracticePlan(id: string, data)`
Update plan metadata (name, date, notes).
- **Auth:** Required
- **Returns:** Updated `PracticePlan`

#### `deletePracticePlan(id: string)`
Delete a practice plan and all its periods (cascade).
- **Auth:** Required

#### `addPracticePeriod(data)`
Add a period to a practice plan. Auto-increments sort order.
- **Auth:** Required
- **Parameters:** `practicePlanId`, `name`, `durationMin`, `playIds?` (string[]), `notes?`
- **Returns:** Created `PracticePeriod`

#### `updatePracticePeriod(id: string, data)`
Update a period's name, duration, play IDs, or notes.
- **Auth:** Required
- **Returns:** Updated `PracticePeriod`

#### `deletePracticePeriod(id: string)`
Delete a period.
- **Auth:** Required

#### `reorderPracticePeriods(planId: string, periodIds: string[])`
Set the period order based on array index position. Uses a database transaction.
- **Auth:** Required
