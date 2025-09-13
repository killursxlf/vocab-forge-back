-- AlterTable
ALTER TABLE "public"."Word" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "learnedAt" TIMESTAMP(3),
ADD COLUMN     "missStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timesCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timesSeen" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."ReviewEvent" (
    "id" TEXT NOT NULL,
    "wordId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "knows" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewEvent_userId_createdAt_idx" ON "public"."ReviewEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewEvent_userId_wordId_createdAt_idx" ON "public"."ReviewEvent"("userId", "wordId", "createdAt");

-- CreateIndex
CREATE INDEX "Word_wordSetId_status_lastReviewedAt_idx" ON "public"."Word"("wordSetId", "status", "lastReviewedAt");

-- AddForeignKey
ALTER TABLE "public"."ReviewEvent" ADD CONSTRAINT "ReviewEvent_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "public"."Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
