-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "matchIndex" INTEGER NOT NULL,
    "bestOf" INTEGER NOT NULL DEFAULT 1,
    "groupName" TEXT,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "teamAScore" INTEGER NOT NULL DEFAULT 0,
    "teamBScore" INTEGER NOT NULL DEFAULT 0,
    "teamAAdvantage" INTEGER NOT NULL DEFAULT 0,
    "teamBAdvantage" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" DATETIME,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextMatchId" TEXT,
    "nextMatchSlot" INTEGER,
    "nextLoserMatchId" TEXT,
    "nextLoserMatchSlot" INTEGER,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("bestOf", "groupName", "id", "matchIndex", "nextLoserMatchId", "nextLoserMatchSlot", "nextMatchId", "nextMatchSlot", "roundName", "scheduledAt", "section", "status", "teamAAdvantage", "teamAId", "teamAScore", "teamBAdvantage", "teamBId", "teamBScore", "tournamentId", "winnerId") SELECT "bestOf", "groupName", "id", "matchIndex", "nextLoserMatchId", "nextLoserMatchSlot", "nextMatchId", "nextMatchSlot", "roundName", "scheduledAt", "section", "status", "teamAAdvantage", "teamAId", "teamAScore", "teamBAdvantage", "teamBId", "teamBScore", "tournamentId", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
