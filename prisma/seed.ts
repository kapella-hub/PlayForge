import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create coach user
  const coach = await prisma.user.upsert({
    where: { email: "coach@playforge.dev" },
    update: {},
    create: {
      email: "coach@playforge.dev",
      name: "Coach Johnson",
    },
  });
  console.log(`  Coach: ${coach.email} (${coach.id})`);

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: "lincoln-varsity" },
    update: {},
    create: {
      name: "Lincoln High Varsity",
      slug: "lincoln-varsity",
      tier: "high_school",
      inviteCode: "PLAY01",
    },
  });
  console.log(`  Org: ${org.name} (invite code: ${org.inviteCode})`);

  // Coach membership
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: coach.id, orgId: org.id } },
    update: {},
    create: {
      userId: coach.id,
      orgId: org.id,
      role: "owner",
    },
  });

  // Create player users
  const players = [
    { email: "marcus@playforge.dev", name: "Marcus Williams", position: "WR" },
    { email: "jaylen@playforge.dev", name: "Jaylen Carter", position: "QB" },
    { email: "devon@playforge.dev", name: "Devon Smith", position: "RB" },
  ];

  for (const p of players) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { email: p.email, name: p.name },
    });
    await prisma.membership.upsert({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
      update: {},
      create: {
        userId: user.id,
        orgId: org.id,
        role: "player",
        position: p.position,
      },
    });
    console.log(`  Player: ${p.name} (${p.position})`);
  }

  // Create playbook
  const playbook = await prisma.playbook.upsert({
    where: { id: "seed-playbook-offense" },
    update: {},
    create: {
      id: "seed-playbook-offense",
      orgId: org.id,
      name: "Base Offense 2026",
      side: "offense",
      createdById: coach.id,
    },
  });
  console.log(`  Playbook: ${playbook.name}`);

  // Create plays with canvas data
  const playsData = [
    {
      id: "seed-play-mesh",
      name: "Mesh Concept",
      formation: "Shotgun 2x2",
      playType: "pass" as const,
      situationTags: ["3rd & medium", "red zone"],
      notes: "Key read is the MLB. If he drops, check down to the RB in the flat.",
      canvasData: {
        players: [
          { id: "C", label: "C", x: 500, y: 350, side: "offense" },
          { id: "LG", label: "LG", x: 460, y: 350, side: "offense" },
          { id: "RG", label: "RG", x: 540, y: 350, side: "offense" },
          { id: "LT", label: "LT", x: 420, y: 350, side: "offense" },
          { id: "RT", label: "RT", x: 580, y: 350, side: "offense" },
          { id: "QB", label: "QB", x: 500, y: 400, side: "offense" },
          { id: "RB", label: "RB", x: 540, y: 410, side: "offense" },
          { id: "WR1", label: "X", x: 180, y: 350, side: "offense" },
          { id: "WR2", label: "Z", x: 820, y: 350, side: "offense" },
          { id: "SL1", label: "H", x: 340, y: 350, side: "offense" },
          { id: "SL2", label: "Y", x: 660, y: 350, side: "offense" },
        ],
        routes: [
          { playerId: "WR1", waypoints: [{ x: 180, y: 350 }, { x: 180, y: 300 }, { x: 350, y: 280 }], type: "solid", routeType: "drag" },
          { playerId: "WR2", waypoints: [{ x: 820, y: 350 }, { x: 820, y: 300 }, { x: 650, y: 280 }], type: "solid", routeType: "drag" },
          { playerId: "SL1", waypoints: [{ x: 340, y: 350 }, { x: 340, y: 310 }, { x: 250, y: 280 }], type: "solid", routeType: "out" },
          { playerId: "SL2", waypoints: [{ x: 660, y: 350 }, { x: 660, y: 310 }, { x: 750, y: 280 }], type: "solid", routeType: "out" },
          { playerId: "RB", waypoints: [{ x: 540, y: 410 }, { x: 600, y: 380 }, { x: 650, y: 350 }], type: "dashed", routeType: "flat" },
        ],
        meta: { formation: "Shotgun 2x2", playType: "pass", side: "offense" },
      },
    },
    {
      id: "seed-play-hb-dive",
      name: "HB Dive",
      formation: "I-Formation",
      playType: "run" as const,
      situationTags: ["short yardage", "goal line"],
      notes: "A gap. FB kicks out the DT, RB hits the hole hard.",
      canvasData: {
        players: [
          { id: "C", label: "C", x: 500, y: 350, side: "offense" },
          { id: "LG", label: "LG", x: 460, y: 350, side: "offense" },
          { id: "RG", label: "RG", x: 540, y: 350, side: "offense" },
          { id: "LT", label: "LT", x: 420, y: 350, side: "offense" },
          { id: "RT", label: "RT", x: 580, y: 350, side: "offense" },
          { id: "QB", label: "QB", x: 500, y: 380, side: "offense" },
          { id: "FB", label: "FB", x: 500, y: 410, side: "offense" },
          { id: "RB", label: "RB", x: 500, y: 440, side: "offense" },
          { id: "WR1", label: "X", x: 180, y: 350, side: "offense" },
          { id: "WR2", label: "Z", x: 820, y: 350, side: "offense" },
          { id: "TE", label: "TE", x: 620, y: 350, side: "offense" },
        ],
        routes: [
          { playerId: "RB", waypoints: [{ x: 500, y: 440 }, { x: 500, y: 380 }, { x: 500, y: 310 }], type: "thick" },
          { playerId: "FB", waypoints: [{ x: 500, y: 410 }, { x: 480, y: 360 }, { x: 470, y: 330 }], type: "thick" },
        ],
        meta: { formation: "I-Formation", playType: "run", side: "offense" },
      },
    },
    {
      id: "seed-play-pa-boot",
      name: "PA Bootleg",
      formation: "Singleback",
      playType: "play_action" as const,
      situationTags: ["2nd & medium", "play action"],
      notes: "Fake the dive, QB rolls right. Look for the TE on the corner route first.",
      canvasData: {
        players: [
          { id: "C", label: "C", x: 500, y: 350, side: "offense" },
          { id: "LG", label: "LG", x: 460, y: 350, side: "offense" },
          { id: "RG", label: "RG", x: 540, y: 350, side: "offense" },
          { id: "LT", label: "LT", x: 420, y: 350, side: "offense" },
          { id: "RT", label: "RT", x: 580, y: 350, side: "offense" },
          { id: "QB", label: "QB", x: 500, y: 380, side: "offense" },
          { id: "RB", label: "RB", x: 500, y: 420, side: "offense" },
          { id: "WR1", label: "X", x: 180, y: 350, side: "offense" },
          { id: "WR2", label: "Z", x: 820, y: 350, side: "offense" },
          { id: "SL", label: "H", x: 340, y: 350, side: "offense" },
          { id: "TE", label: "TE", x: 620, y: 350, side: "offense" },
        ],
        routes: [
          { playerId: "QB", waypoints: [{ x: 500, y: 380 }, { x: 620, y: 380 }, { x: 700, y: 360 }], type: "dashed" },
          { playerId: "TE", waypoints: [{ x: 620, y: 350 }, { x: 680, y: 320 }, { x: 750, y: 250 }], type: "solid", routeType: "corner" },
          { playerId: "WR2", waypoints: [{ x: 820, y: 350 }, { x: 820, y: 280 }, { x: 820, y: 200 }], type: "solid", routeType: "go" },
          { playerId: "RB", waypoints: [{ x: 500, y: 420 }, { x: 500, y: 370 }, { x: 500, y: 330 }], type: "thick" },
        ],
        meta: { formation: "Singleback", playType: "play_action", side: "offense" },
      },
    },
    {
      id: "seed-play-slant-flat",
      name: "Slant-Flat",
      formation: "Shotgun Trips",
      playType: "pass" as const,
      situationTags: ["quick game", "3rd & short"],
      notes: "Quick 3-step drop. Read the flat defender — if he sits on the flat, throw the slant.",
      canvasData: {
        players: [
          { id: "C", label: "C", x: 500, y: 350, side: "offense" },
          { id: "LG", label: "LG", x: 460, y: 350, side: "offense" },
          { id: "RG", label: "RG", x: 540, y: 350, side: "offense" },
          { id: "LT", label: "LT", x: 420, y: 350, side: "offense" },
          { id: "RT", label: "RT", x: 580, y: 350, side: "offense" },
          { id: "QB", label: "QB", x: 500, y: 400, side: "offense" },
          { id: "RB", label: "RB", x: 450, y: 410, side: "offense" },
          { id: "WR1", label: "X", x: 180, y: 350, side: "offense" },
          { id: "WR2", label: "Z", x: 820, y: 350, side: "offense" },
          { id: "SL1", label: "H", x: 700, y: 350, side: "offense" },
          { id: "SL2", label: "Y", x: 760, y: 355, side: "offense" },
        ],
        routes: [
          { playerId: "SL1", waypoints: [{ x: 700, y: 350 }, { x: 680, y: 330 }, { x: 620, y: 300 }], type: "solid", routeType: "slant" },
          { playerId: "SL2", waypoints: [{ x: 760, y: 355 }, { x: 800, y: 340 }, { x: 850, y: 340 }], type: "solid", routeType: "flat" },
          { playerId: "WR2", waypoints: [{ x: 820, y: 350 }, { x: 800, y: 330 }, { x: 740, y: 280 }], type: "solid", routeType: "slant" },
        ],
        meta: { formation: "Shotgun Trips", playType: "pass", side: "offense" },
      },
    },
  ];

  for (const play of playsData) {
    await prisma.play.upsert({
      where: { id: play.id },
      update: {},
      create: {
        id: play.id,
        playbookId: playbook.id,
        name: play.name,
        formation: play.formation,
        playType: play.playType,
        situationTags: play.situationTags,
        canvasData: play.canvasData,
        animationData: {},
        notes: play.notes,
        createdById: coach.id,
      },
    });
    console.log(`  Play: ${play.name}`);
  }

  // Create game plan with the plays
  const gamePlan = await prisma.gamePlan.upsert({
    where: { id: "seed-gameplan" },
    update: {},
    create: {
      id: "seed-gameplan",
      orgId: org.id,
      name: "Week 1 vs Eagles",
      week: 1,
      opponent: "Eagles",
      isActive: true,
      createdById: coach.id,
    },
  });
  console.log(`  Game Plan: ${gamePlan.name} (active)`);

  for (let i = 0; i < playsData.length; i++) {
    await prisma.gamePlanPlay.upsert({
      where: { gamePlanId_playId: { gamePlanId: gamePlan.id, playId: playsData[i].id } },
      update: {},
      create: {
        gamePlanId: gamePlan.id,
        playId: playsData[i].id,
        sortOrder: i + 1,
      },
    });
  }

  // Create a quiz
  const quiz = await prisma.quiz.upsert({
    where: { id: "seed-quiz" },
    update: {},
    create: {
      id: "seed-quiz",
      orgId: org.id,
      name: "Week 1 Quiz",
      gamePlanId: gamePlan.id,
      dueDate: new Date(Date.now() + 3 * 86400000), // 3 days from now
      createdById: coach.id,
    },
  });
  console.log(`  Quiz: ${quiz.name}`);

  // Add quiz questions
  const questions = [
    {
      playId: "seed-play-mesh",
      questionType: "multiple_choice" as const,
      questionText: "What is the QB's primary read on Mesh Concept?",
      options: [
        { text: "The X receiver on the drag route", correct: false },
        { text: "The MLB — if he drops, check down to RB", correct: true },
        { text: "The Z receiver on the go route", correct: false },
        { text: "The RB in the backfield", correct: false },
      ],
    },
    {
      playId: "seed-play-hb-dive",
      questionType: "multiple_choice" as const,
      questionText: "What gap does the RB hit on HB Dive?",
      options: [
        { text: "B gap", correct: false },
        { text: "C gap", correct: false },
        { text: "A gap", correct: true },
        { text: "Off tackle", correct: false },
      ],
    },
    {
      playId: "seed-play-pa-boot",
      questionType: "multiple_choice" as const,
      questionText: "Who is the first read on PA Bootleg?",
      options: [
        { text: "The Z receiver on the go route", correct: false },
        { text: "The RB in the flat", correct: false },
        { text: "The TE on the corner route", correct: true },
        { text: "The X receiver on the slant", correct: false },
      ],
    },
    {
      playId: "seed-play-slant-flat",
      questionType: "multiple_choice" as const,
      questionText: "On Slant-Flat, what determines whether you throw the slant or the flat?",
      options: [
        { text: "The coverage shell", correct: false },
        { text: "The flat defender — if he sits on flat, throw slant", correct: true },
        { text: "The safety rotation", correct: false },
        { text: "Always throw the slant first", correct: false },
      ],
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    await prisma.quizQuestion.upsert({
      where: { id: `seed-question-${i}` },
      update: {},
      create: {
        id: `seed-question-${i}`,
        quizId: quiz.id,
        playId: questions[i].playId,
        questionType: questions[i].questionType,
        questionText: questions[i].questionText,
        options: questions[i].options,
        sortOrder: i + 1,
      },
    });
  }

  console.log(`  ${questions.length} quiz questions added`);
  console.log("\nDone! You can now sign in as:");
  console.log("  Coach: coach@playforge.dev");
  console.log("  Player: marcus@playforge.dev / jaylen@playforge.dev / devon@playforge.dev");
  console.log(`  Invite code: ${org.inviteCode}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
