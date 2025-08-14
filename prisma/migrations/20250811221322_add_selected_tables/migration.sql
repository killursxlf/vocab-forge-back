-- AlterTable
ALTER TABLE "public"."card_settings" ADD COLUMN     "selectedTables" TEXT[] DEFAULT ARRAY['all']::TEXT[];
