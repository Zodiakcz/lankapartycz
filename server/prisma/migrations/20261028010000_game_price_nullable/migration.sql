-- RedefineTables: Game.price becomes nullable; null = price not filled in (games from before voting)
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'steam',
    "sourceNote" TEXT NOT NULL DEFAULT '',
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "storeUrl" TEXT NOT NULL DEFAULT '',
    "tier" TEXT NOT NULL DEFAULT 'silver',
    "price" INTEGER,
    "submittedById" INTEGER,
    CONSTRAINT "Game_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Game" SELECT "id", "name", "source", "sourceNote", "minPlayers", "maxPlayers", "imageUrl", "storeUrl", "tier", "price", "submittedById" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;

-- Sources narrowed to steam / epic / copied / web; the free games in use are browser games
UPDATE "Game" SET "source" = 'web' WHERE "source" = 'free';

-- Existing paid games had no real price, only the 0 default; keep 0 where it is true
UPDATE "Game" SET "price" = NULL WHERE "price" = 0 AND "source" NOT IN ('web', 'copied') AND "tier" <> 'bronze';
