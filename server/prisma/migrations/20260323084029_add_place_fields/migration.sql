-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "spotifyInfo" TEXT NOT NULL DEFAULT '',
    "placeAddress" TEXT NOT NULL DEFAULT '',
    "placeStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "partyId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'maybe',
    "arrival" DATETIME,
    "departure" DATETIME,
    "advance" REAL NOT NULL DEFAULT 0,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'steam',
    "sourceNote" TEXT NOT NULL DEFAULT '',
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER,
    "imageUrl" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "PartyGame" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    CONSTRAINT "PartyGame_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "gameId" INTEGER,
    CONSTRAINT "Schedule_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "paidByUserId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoodEstimate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ks',
    "perNight" REAL NOT NULL DEFAULT 0,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FoodEstimate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackingItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "partyId" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'general',
    CONSTRAINT "PackingItem_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_partyId_key" ON "Attendance"("userId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyGame_partyId_gameId_key" ON "PartyGame"("partyId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodEstimate_partyId_category_key" ON "FoodEstimate"("partyId", "category");
