-- CreateTable
CREATE TABLE "PlayVersion" (
    "id" TEXT NOT NULL,
    "playId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "canvasData" JSONB NOT NULL,
    "animationData" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayVersion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlayVersion" ADD CONSTRAINT "PlayVersion_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayVersion" ADD CONSTRAINT "PlayVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
