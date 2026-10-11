-- Existing words become due once without changing their progress or history.
ALTER TABLE "Word"
ADD COLUMN "reviewBox" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Word" ADD CONSTRAINT "Word_reviewBox_check"
CHECK ("reviewBox" BETWEEN 0 AND 6);

CREATE INDEX "Word_wordSetId_nextReviewAt_id_idx"
ON "Word"("wordSetId", "nextReviewAt", "id");
