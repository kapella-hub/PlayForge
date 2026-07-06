-- AlterTable
ALTER TABLE "PlayerProgress" ALTER COLUMN "nextReviewAt" DROP NOT NULL,
ALTER COLUMN "nextReviewAt" DROP DEFAULT;
