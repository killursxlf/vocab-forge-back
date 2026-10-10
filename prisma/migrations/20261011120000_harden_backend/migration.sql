ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "WordSet" DROP CONSTRAINT "WordSet_userId_fkey";
ALTER TABLE "WordSet" ADD CONSTRAINT "WordSet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Word" DROP CONSTRAINT "Word_wordSetId_fkey";
ALTER TABLE "Word" ADD CONSTRAINT "Word_wordSetId_fkey"
  FOREIGN KEY ("wordSetId") REFERENCES "WordSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_settings" ALTER COLUMN "frontKey" SET DEFAULT 'original';
CREATE INDEX "WordSet_userId_id_idx" ON "WordSet"("userId", "id");
CREATE INDEX "Word_wordSetId_createdAt_id_idx" ON "Word"("wordSetId", "createdAt", "id");

CREATE TABLE "AuthRateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
