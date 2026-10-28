-- AlterTable: replace admin approval with gold/silver/bronze tiers; existing games land in silver
ALTER TABLE "Game" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'silver';
ALTER TABLE "Game" ADD COLUMN "price" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Game" DROP COLUMN "approved";

-- CreateTable
CREATE TABLE "GameVote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameVote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameVote_gameId_userId_key" ON "GameVote"("gameId", "userId");
