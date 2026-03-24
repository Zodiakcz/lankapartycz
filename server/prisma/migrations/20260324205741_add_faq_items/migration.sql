-- CreateTable
CREATE TABLE "FaqItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "spotifyInfo" TEXT NOT NULL DEFAULT '',
    "placeAddress" TEXT NOT NULL DEFAULT '',
    "placeStatus" TEXT NOT NULL DEFAULT 'pending',
    "advancePerNight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Party" ("createdAt", "description", "endDate", "id", "location", "name", "placeAddress", "placeStatus", "spotifyInfo", "startDate") SELECT "createdAt", "description", "endDate", "id", "location", "name", "placeAddress", "placeStatus", "spotifyInfo", "startDate" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
