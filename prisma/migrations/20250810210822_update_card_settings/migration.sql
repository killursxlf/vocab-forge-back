-- CreateTable
CREATE TABLE "public"."card_settings" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "frontKey" TEXT NOT NULL DEFAULT 'word',
    "backKey" TEXT NOT NULL DEFAULT 'translation',
    "selectedStatuses" TEXT[] DEFAULT ARRAY['all']::TEXT[],
    "hintKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_settings_userId_key" ON "public"."card_settings"("userId");

-- AddForeignKey
ALTER TABLE "public"."card_settings" ADD CONSTRAINT "card_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
