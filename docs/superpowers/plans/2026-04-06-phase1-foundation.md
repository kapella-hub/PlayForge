# PlayForge Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project with database, auth, role-based layouts (coach sidebar + player bottom tabs), and core data models — the foundation everything else builds on.

**Architecture:** Next.js 15 App Router with TailwindCSS v4 and Framer Motion. PostgreSQL via Prisma ORM. NextAuth.js v5 for authentication with magic link, Google OAuth, and email/password. Route groups `(auth)`, `(coach)`, and `(player)` with shared layouts.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS v4, Framer Motion, Prisma, PostgreSQL, NextAuth.js v5, Vitest

---

## File Map

### New Files

```
playforge/
├── .env.example                          # Environment variable template
├── .gitignore                            # Node/Next.js ignores
├── package.json                          # Dependencies and scripts
├── tsconfig.json                         # TypeScript config
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # TailwindCSS config (if needed beyond v4 defaults)
├── postcss.config.mjs                    # PostCSS for Tailwind
├── vitest.config.ts                      # Test runner config
├── prisma/
│   └── schema.prisma                     # Full database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (html, body, providers)
│   │   ├── page.tsx                      # Landing/redirect page
│   │   ├── globals.css                   # Tailwind imports + custom CSS vars
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx            # Login page (magic link, Google, password)
│   │   │   ├── signup/page.tsx           # Signup page
│   │   │   ├── join/page.tsx             # Player join via invite code
│   │   │   └── layout.tsx               # Auth layout (centered card)
│   │   ├── (coach)/
│   │   │   ├── layout.tsx               # Coach layout (sidebar nav)
│   │   │   └── dashboard/page.tsx       # Coach dashboard (placeholder)
│   │   ├── (player)/
│   │   │   ├── layout.tsx               # Player layout (bottom tabs)
│   │   │   └── home/page.tsx            # Player home (placeholder)
│   │   └── api/
│   │       └── auth/[...nextauth]/route.ts  # NextAuth route handler
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx               # Button component
│   │   │   ├── card.tsx                 # Card component
│   │   │   ├── input.tsx                # Input component
│   │   │   └── badge.tsx                # Badge/tag component
│   │   └── layout/
│   │       ├── coach-sidebar.tsx         # Coach sidebar navigation
│   │       ├── player-tabs.tsx           # Player bottom tab navigation
│   │       └── user-menu.tsx             # User avatar + dropdown menu
│   ├── lib/
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── auth.ts                      # NextAuth config + helpers
│   │   └── utils.ts                     # cn() helper and common utilities
│   └── types/
│       └── index.ts                     # Shared TypeScript types (enums, etc.)
└── tests/
    ├── setup.ts                         # Vitest global setup
    ├── lib/
    │   └── utils.test.ts                # Utility function tests
    └── components/
        └── ui/
            └── button.test.tsx          # Button component test
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run from the PlayForge repo root:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. This scaffolds Next.js 15 with App Router, TypeScript, TailwindCSS, and ESLint.

- [ ] **Step 2: Verify the scaffold works**

```bash
npm run dev
```

Expected: Dev server starts on http://localhost:3000, default Next.js page renders.

Kill the dev server after confirming (Ctrl+C).

- [ ] **Step 3: Install additional dependencies**

```bash
npm install framer-motion @prisma/client next-auth@beta class-variance-authority clsx tailwind-merge lucide-react
npm install -D prisma vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Create `.env.example`**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/playforge"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email (magic link)
EMAIL_SERVER_HOST=""
EMAIL_SERVER_PORT=""
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM=""
```

- [ ] **Step 5: Create utility helpers in `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

- [ ] **Step 6: Create shared types in `src/types/index.ts`**

```typescript
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
  NEW: "new",
  LEARNING: "learning",
  REVIEWING: "reviewing",
  MASTERED: "mastered",
} as const;
export type MasteryLevel = (typeof MasteryLevel)[keyof typeof MasteryLevel];
```

- [ ] **Step 7: Create Vitest config at `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 8: Create test setup at `tests/setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 9: Add test script to `package.json`**

Add to the `"scripts"` section:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 10: Write a test for `generateInviteCode`**

Create `tests/lib/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateInviteCode, cn } from "@/lib/utils";

describe("generateInviteCode", () => {
  it("returns a 6-character string", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("only contains uppercase letters and digits (no ambiguous chars)", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});
```

- [ ] **Step 11: Run tests to verify they pass**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with TailwindCSS, Vitest, and shared types"
```

---

### Task 2: Database Schema (Prisma)

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env` (create `.env` from `.env.example` if needed).

- [ ] **Step 2: Write the full schema in `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Tier {
  youth
  high_school
  college
  pro
}

enum MemberRole {
  owner
  coach
  coordinator
  player
}

enum Side {
  offense
  defense
  special_teams
}

enum Visibility {
  private
  shared
}

enum PlayType {
  run
  pass
  play_action
  screen
  special
}

enum AssignmentType {
  route
  block
  blitz
  coverage
  spy
}

enum QuestionType {
  multiple_choice
  tap_field
  identify_route
  situation_match
  assignment_recall
}

enum MasteryLevel {
  new_play
  learning
  reviewing
  mastered
}

// --- NextAuth required models ---

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// --- App models ---

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  createdAt     DateTime  @default(now())

  accounts       Account[]
  sessions       Session[]
  memberships    Membership[]
  createdPlaybooks Playbook[]  @relation("PlaybookCreator")
  createdPlays   Play[]        @relation("PlayCreator")
  createdGamePlans GamePlan[]  @relation("GamePlanCreator")
  createdQuizzes Quiz[]        @relation("QuizCreator")
  quizAttempts   QuizAttempt[]
  playerProgress PlayerProgress[]
}

model Organization {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  logoUrl    String?
  tier       Tier     @default(high_school)
  inviteCode String   @unique
  createdAt  DateTime @default(now())

  memberships Membership[]
  playbooks   Playbook[]
  gamePlans   GamePlan[]
  quizzes     Quiz[]
}

model Membership {
  id            String     @id @default(cuid())
  userId        String
  orgId         String
  role          MemberRole @default(player)
  positionGroup String?
  position      String?

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
}

model Playbook {
  id          String     @id @default(cuid())
  orgId       String
  name        String
  description String?
  side        Side
  visibility  Visibility @default(private)
  createdById String
  createdAt   DateTime   @default(now())

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy User         @relation("PlaybookCreator", fields: [createdById], references: [id])
  plays     Play[]
}

model Play {
  id            String   @id @default(cuid())
  playbookId    String
  name          String
  formation     String
  playType      PlayType
  situationTags String[]
  canvasData    Json     @default("{}")
  animationData Json     @default("{}")
  notes         String?
  filmUrl       String?
  thumbnailUrl  String?
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  playbook       Playbook         @relation(fields: [playbookId], references: [id], onDelete: Cascade)
  createdBy      User             @relation("PlayCreator", fields: [createdById], references: [id])
  assignments    PlayAssignment[]
  gamePlanPlays  GamePlanPlay[]
  quizQuestions  QuizQuestion[]
  playerProgress PlayerProgress[]
}

model PlayAssignment {
  id             String         @id @default(cuid())
  playId         String
  position       String
  assignmentType AssignmentType
  routeType      String?
  blockType      String?
  readOrder      Int?
  description    String?

  play Play @relation(fields: [playId], references: [id], onDelete: Cascade)
}

model GamePlan {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  week        Int?
  opponent    String?
  isActive    Boolean  @default(false)
  createdById String
  createdAt   DateTime @default(now())

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy User         @relation("GamePlanCreator", fields: [createdById], references: [id])
  plays     GamePlanPlay[]
  quizzes   Quiz[]
}

model GamePlanPlay {
  id            String  @id @default(cuid())
  gamePlanId    String
  playId        String
  sortOrder     Int
  situationNote String?

  gamePlan GamePlan @relation(fields: [gamePlanId], references: [id], onDelete: Cascade)
  play     Play     @relation(fields: [playId], references: [id], onDelete: Cascade)

  @@unique([gamePlanId, playId])
}

model Quiz {
  id          String    @id @default(cuid())
  orgId       String
  name        String
  gamePlanId  String?
  dueDate     DateTime?
  createdById String
  createdAt   DateTime  @default(now())

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  gamePlan  GamePlan?    @relation(fields: [gamePlanId], references: [id])
  createdBy User         @relation("QuizCreator", fields: [createdById], references: [id])
  questions QuizQuestion[]
  attempts  QuizAttempt[]
}

model QuizQuestion {
  id            String       @id @default(cuid())
  quizId        String
  playId        String
  questionType  QuestionType
  questionText  String
  options       Json?
  correctZone   Json?
  correctAnswer String?
  sortOrder     Int

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  play Play @relation(fields: [playId], references: [id], onDelete: Cascade)
}

model QuizAttempt {
  id          String    @id @default(cuid())
  quizId      String
  userId      String
  score       Float
  answers     Json
  startedAt   DateTime  @default(now())
  completedAt DateTime?

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PlayerProgress {
  id            String       @id @default(cuid())
  userId        String
  playId        String
  views         Int          @default(0)
  timeSpentSec  Int          @default(0)
  lastViewedAt  DateTime?
  masteryLevel  MasteryLevel @default(new_play)
  easeFactor    Float        @default(2.5)
  intervalDays  Float        @default(0)
  nextReviewAt  DateTime     @default(now())
  quizScores    Float[]

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  play Play @relation(fields: [playId], references: [id], onDelete: Cascade)

  @@unique([userId, playId])
}
```

- [ ] **Step 3: Create Prisma client singleton at `src/lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 5: Run migration (requires a running PostgreSQL)**

If you have Docker:

```bash
docker run -d --name playforge-db -e POSTGRES_USER=playforge -e POSTGRES_PASSWORD=playforge -e POSTGRES_DB=playforge -p 5432:5432 postgres:16
```

Set `DATABASE_URL="postgresql://playforge:playforge@localhost:5432/playforge"` in `.env`, then:

```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied. All tables created.

- [ ] **Step 6: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Opens browser at http://localhost:5555 showing all tables.

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: add Prisma schema with all data models and migrations"
```

---

### Task 3: Authentication (NextAuth.js v5)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create NextAuth config at `src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // For v1, we use a simple email lookup — passwords added later
        if (!credentials?.email) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 2: Install Prisma adapter**

```bash
npm install @auth/prisma-adapter
```

- [ ] **Step 3: Create API route at `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Extend Next.js types for session**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

- [ ] **Step 5: Generate a NEXTAUTH_SECRET and add to `.env`**

```bash
openssl rand -base64 32
```

Copy the output into `.env` as `NEXTAUTH_SECRET="<generated-value>"`.

- [ ] **Step 6: Verify auth route loads**

```bash
npm run dev
```

Visit http://localhost:3000/api/auth/providers — should return JSON with `google` and `credentials` providers.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/types/next-auth.d.ts
git commit -m "feat: add NextAuth.js v5 with Google OAuth and credentials providers"
```

---

### Task 4: UI Primitives (Button, Card, Input, Badge)

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`
- Test: `tests/components/ui/button.test.tsx`

- [ ] **Step 1: Write a failing test for Button**

Create `tests/components/ui/button.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole("button", { name: "Outline" });
    expect(btn.className).toContain("border");
  });

  it("applies size classes", () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole("button", { name: "Small" });
    expect(btn.className).toContain("h-9");
  });

  it("supports disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/components/ui/button.test.tsx
```

Expected: FAIL — `Button` module not found.

- [ ] **Step 3: Create `src/components/ui/button.tsx`**

```typescript
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white hover:bg-indigo-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
        link: "text-indigo-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 4: Create `src/components/ui/card.tsx`**

```typescript
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-100 shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

- [ ] **Step 5: Create `src/components/ui/input.tsx`**

```typescript
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 6: Create `src/components/ui/badge.tsx`**

```typescript
import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-indigo-600/20 text-indigo-400",
        success: "bg-green-600/20 text-green-400",
        warning: "bg-amber-600/20 text-amber-400",
        destructive: "bg-red-600/20 text-red-400",
        outline: "border border-zinc-700 text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm run test:run -- tests/components/ui/button.test.tsx
```

Expected: All 4 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/ tests/components/
git commit -m "feat: add UI primitives (Button, Card, Input, Badge) with dark theme"
```

---

### Task 5: Global Styles and Dark Theme

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace `src/app/globals.css` with PlayForge theme**

```css
@import "tailwindcss";

:root {
  --background: #0a0a14;
  --foreground: #f4f4f5;
  --card: #111122;
  --card-foreground: #f4f4f5;
  --primary: #6366f1;
  --primary-foreground: #ffffff;
  --secondary: #1a1a2e;
  --secondary-foreground: #f4f4f5;
  --muted: #27273a;
  --muted-foreground: #a1a1aa;
  --accent: #6366f1;
  --destructive: #ef4444;
  --border: #27273a;
  --ring: #6366f1;
  --success: #22c55e;
  --warning: #f59e0b;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--muted);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}

/* Selection */
::selection {
  background: rgba(99, 102, 241, 0.3);
  color: white;
}
```

- [ ] **Step 2: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PlayForge — Interactive Football Playbook",
  description:
    "Build, animate, and share football plays. Help your team learn with interactive quizzes and spaced repetition.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx` with a landing redirect**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // TODO: Redirect based on role (coach → /dashboard, player → /home)
  redirect("/dashboard");
}
```

- [ ] **Step 4: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds (may warn about missing env vars for auth — that's fine).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add dark theme, Inter font, and root layout with auth redirect"
```

---

### Task 6: Coach Layout (Sidebar Navigation)

**Files:**
- Create: `src/components/layout/coach-sidebar.tsx`, `src/components/layout/user-menu.tsx`, `src/app/(coach)/layout.tsx`, `src/app/(coach)/dashboard/page.tsx`

- [ ] **Step 1: Create `src/components/layout/coach-sidebar.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  PenTool,
  Users,
  FileQuestion,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";

const navItems = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Playbooks", href: "/playbooks", icon: BookOpen },
      { name: "Game Plans", href: "/game-plans", icon: Target },
      { name: "Play Designer", href: "/designer", icon: PenTool },
    ],
  },
  {
    label: "Team",
    items: [
      { name: "Roster", href: "/roster", icon: Users },
      { name: "Quizzes", href: "/quizzes", icon: FileQuestion },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [{ name: "Organization", href: "/settings", icon: Settings }],
  },
];

export function CoachSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm">
            PF
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold text-white"
            >
              PlayForge
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navItems.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[#111122] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 border-r border-zinc-800 bg-[#111122] transition-all duration-300",
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Create `src/components/layout/user-menu.tsx`**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        {user.image ? (
          <img src={user.image} alt="" className="h-9 w-9 rounded-full" />
        ) : (
          initials
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl"
          >
            <div className="border-b border-zinc-800 px-4 py-3">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Create coach layout at `src/app/(coach)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CoachSidebar } from "@/components/layout/coach-sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <CoachSidebar />

      {/* Main content area */}
      <div className="lg:pl-[240px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end border-b border-zinc-800 bg-[var(--background)]/80 px-6 backdrop-blur-md">
          <UserMenu user={session.user} />
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create coach dashboard placeholder at `src/app/(coach)/dashboard/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Total Plays", value: "—", color: "text-white" },
  { label: "This Week's Install", value: "—", color: "text-green-400" },
  { label: "Player Completion", value: "—", color: "text-amber-400" },
  { label: "Avg Quiz Score", value: "—", color: "text-indigo-400" },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Welcome to PlayForge. Create a playbook to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
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
    </div>
  );
}
```

- [ ] **Step 5: Verify the coach layout renders**

```bash
npm run dev
```

Visit http://localhost:3000/dashboard (you may need to bypass auth temporarily or create a test user via Prisma Studio). Verify:
- Dark sidebar with PlayForge logo and navigation items
- Stats cards render in the main content area
- Responsive: sidebar collapses to hamburger on mobile widths

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/\(coach\)/
git commit -m "feat: add coach sidebar layout with responsive navigation and dashboard placeholder"
```

---

### Task 7: Player Layout (Bottom Tab Navigation)

**Files:**
- Create: `src/components/layout/player-tabs.tsx`, `src/app/(player)/layout.tsx`, `src/app/(player)/home/page.tsx`

- [ ] **Step 1: Create `src/components/layout/player-tabs.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BookOpen, FileQuestion, BarChart3 } from "lucide-react";

const tabs = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Plays", href: "/plays", icon: BookOpen },
  { name: "Quiz", href: "/quiz", icon: FileQuestion },
  { name: "Progress", href: "/progress", icon: BarChart3 },
];

export function PlayerTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-[#111122]/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
                isActive ? "text-indigo-400" : "text-zinc-500"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-indigo-400")} />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create player layout at `src/app/(player)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PlayerTabs } from "@/components/layout/player-tabs";
import { UserMenu } from "@/components/layout/user-menu";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-800 bg-[var(--background)]/80 px-4 backdrop-blur-md">
        <span className="text-base font-bold text-indigo-400">PlayForge</span>
        <UserMenu user={session.user} />
      </header>

      <main className="px-4 py-4">{children}</main>

      <PlayerTabs />
    </div>
  );
}
```

- [ ] **Step 3: Create player home placeholder at `src/app/(player)/home/page.tsx`**

```tsx
import { Card, CardContent } from "@/components/ui/card";

export default function PlayerHomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Welcome back 👋</h1>
        <p className="text-sm text-zinc-500">Your study feed is empty. Check back when your coach assigns plays.</p>
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="py-4">
          <div className="text-[11px] font-semibold text-amber-400">NO PLAYS ASSIGNED</div>
          <div className="mt-1 text-sm font-medium text-white">
            Ask your coach for an invite code to join a team.
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">This Week</div>
            <div className="text-sm font-semibold text-zinc-500">0/0</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
            <div className="h-1.5 rounded-full bg-green-500" style={{ width: "0%" }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify the player layout renders**

```bash
npm run dev
```

Visit http://localhost:3000/home. Verify:
- Top bar with PlayForge branding and user menu
- Bottom tab navigation with 4 tabs
- Mobile-first single column layout
- Content has bottom padding so it doesn't hide behind tabs

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/player-tabs.tsx src/app/\(player\)/
git commit -m "feat: add player bottom tab layout with mobile-first home placeholder"
```

---

### Task 8: Auth Pages (Login, Signup, Join)

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/join/page.tsx`

- [ ] **Step 1: Create auth layout at `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create login page at `src/app/(auth)/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, callbackUrl: "/dashboard" });
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
          PF
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to PlayForge</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="coach@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in with Email"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">OR</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline">
              Sign up
            </Link>
          </div>
          <div className="mt-2 text-center text-sm text-zinc-500">
            Player with an invite code?{" "}
            <Link href="/join" className="text-indigo-400 hover:underline">
              Join a team
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

- [ ] **Step 3: Create signup page at `src/app/(auth)/signup/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", orgName: "" });
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/login");
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
          PF
        </div>
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-500">Start building your playbook</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Your name
              </label>
              <Input
                id="name"
                placeholder="Coach Johnson"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="coach@school.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="orgName" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Team / Program name
              </label>
              <Input
                id="orgName"
                placeholder="Lincoln High Varsity"
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create join page at `src/app/(auth)/join/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "profile">("code");
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [form, setForm] = useState({ name: "", email: "", position: "" });
  const [loading, setLoading] = useState(false);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/auth/verify-invite?code=${inviteCode}`);
    if (res.ok) {
      const data = await res.json();
      setOrgName(data.orgName);
      setStep("profile");
    }
    setLoading(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, inviteCode }),
    });
    if (res.ok) {
      router.push("/login");
    }
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
          PF
        </div>
        <h1 className="text-2xl font-bold text-white">Join a team</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {step === "code"
            ? "Enter the invite code from your coach"
            : `Joining ${orgName}`}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === "code" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Invite Code
                </label>
                <Input
                  id="code"
                  placeholder="ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.3em]"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Your name
                </label>
                <Input
                  id="name"
                  placeholder="Marcus Johnson"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="marcus@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="position" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Position
                </label>
                <Input
                  id="position"
                  placeholder="WR, QB, MLB, etc."
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Joining..." : "Join Team"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

- [ ] **Step 5: Verify auth pages render**

```bash
npm run dev
```

Visit http://localhost:3000/login, /signup, and /join. Verify:
- Centered card layout on dark background
- PlayForge logo at top
- Form fields styled consistently
- Links between auth pages work
- Join page has large monospace input for invite code

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add auth pages (login, signup, join team) with dark themed forms"
```

---

### Task 9: API Routes (Signup, Join, Verify Invite)

**Files:**
- Create: `src/app/api/auth/signup/route.ts`, `src/app/api/auth/join/route.ts`, `src/app/api/auth/verify-invite/route.ts`

- [ ] **Step 1: Create signup API at `src/app/api/auth/signup/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";

export async function POST(req: Request) {
  const { name, email, orgName } = await req.json();

  if (!name || !email || !orgName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const user = await db.user.create({
    data: { name, email },
  });

  const org = await db.organization.create({
    data: {
      name: orgName,
      slug: `${slug}-${user.id.slice(0, 6)}`,
      inviteCode: generateInviteCode(),
    },
  });

  await db.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "owner",
    },
  });

  return NextResponse.json({ userId: user.id, orgId: org.id }, { status: 201 });
}
```

- [ ] **Step 2: Create verify-invite API at `src/app/api/auth/verify-invite/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { inviteCode: code.toUpperCase() },
    select: { name: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  return NextResponse.json({ orgName: org.name });
}
```

- [ ] **Step 3: Create join API at `src/app/api/auth/join/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { name, email, position, inviteCode } = await req.json();

  if (!name || !email || !position || !inviteCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
  });

  if (!org) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: { name, email },
    });
  }

  const existingMembership = await db.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
  });

  if (existingMembership) {
    return NextResponse.json({ error: "Already a member of this team" }, { status: 409 });
  }

  await db.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "player",
      position,
    },
  });

  return NextResponse.json({ userId: user.id, orgId: org.id }, { status: 201 });
}
```

- [ ] **Step 4: Verify the signup flow end-to-end**

```bash
npm run dev
```

1. Go to http://localhost:3000/signup
2. Fill in name, email, team name → submit
3. Check Prisma Studio — User, Organization, and Membership should exist
4. Copy the invite code from the Organization record
5. Go to http://localhost:3000/join
6. Enter the invite code → verify it resolves the org name
7. Fill in player details → submit
8. Check Prisma Studio — new User and Membership (role: player) created

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: add signup, join, and verify-invite API routes"
```

---

### Task 10: Session-Aware Root Redirect and Role Routing

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/lib/membership.ts`

- [ ] **Step 1: Create membership helper at `src/lib/membership.ts`**

```typescript
import { db } from "@/lib/db";
import type { MemberRole } from "@prisma/client";

export async function getUserMembership(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { org: true },
    orderBy: { org: { createdAt: "desc" } },
  });
  return membership;
}

export function isCoachRole(role: MemberRole): boolean {
  return role === "owner" || role === "coach" || role === "coordinator";
}
```

- [ ] **Step 2: Update `src/app/page.tsx` with role-based redirect**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getUserMembership(session.user.id);

  if (!membership) {
    redirect("/join");
  }

  if (isCoachRole(membership.role)) {
    redirect("/dashboard");
  }

  redirect("/home");
}
```

- [ ] **Step 3: Verify routing works**

```bash
npm run dev
```

1. Not logged in → redirects to /login
2. Logged in as coach/owner → redirects to /dashboard
3. Logged in as player → redirects to /home
4. Logged in with no membership → redirects to /join

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/lib/membership.ts
git commit -m "feat: add role-based routing (coaches → dashboard, players → home)"
```

---

### Task 11: Final Verification and Cleanup

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no errors (warnings about missing env vars are acceptable).

- [ ] **Step 3: Run linting**

```bash
npm run lint
```

Expected: No errors. Fix any issues found.

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 5: Verify on GitHub**

Visit https://github.com/kapella-hub/PlayForge — confirm all files are pushed and commit history looks clean.

---

## Phase Summary

After completing Phase 1, you have:

- ✅ Next.js 15 project with TypeScript, TailwindCSS v4, Framer Motion
- ✅ PostgreSQL database with full schema (all tables from the spec)
- ✅ NextAuth.js v5 authentication (Google OAuth + credentials)
- ✅ Dark-themed UI primitives (Button, Card, Input, Badge)
- ✅ Coach layout with responsive sidebar navigation
- ✅ Player layout with mobile-first bottom tab navigation
- ✅ Auth pages (login, signup, join team with invite code)
- ✅ API routes for signup, join, and invite verification
- ✅ Role-based routing (coaches → dashboard, players → home)
- ✅ Vitest test setup with passing tests

**Next: Phase 2 — Play Designer (Canvas Engine)**
