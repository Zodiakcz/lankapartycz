-- AlterTable: add storeUrl, approved, submittedById to Game
ALTER TABLE "Game" ADD COLUMN "storeUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Game" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Game" ADD COLUMN "submittedById" INTEGER;
