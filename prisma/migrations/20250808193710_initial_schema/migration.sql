-- CreateEnum
CREATE TYPE "public"."WordStatus" AS ENUM ('NEW', 'LEARNING', 'LEARNED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WordSet" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "customColumns" JSONB NOT NULL DEFAULT '[]',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WordSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Word" (
    "id" SERIAL NOT NULL,
    "original" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "status" "public"."WordStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customFields" JSONB,
    "wordSetId" INTEGER NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."WordSet" ADD CONSTRAINT "WordSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Word" ADD CONSTRAINT "Word_wordSetId_fkey" FOREIGN KEY ("wordSetId") REFERENCES "public"."WordSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
