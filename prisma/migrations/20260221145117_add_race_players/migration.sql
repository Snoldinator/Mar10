-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Race" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "cup" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "player1Id" TEXT,
    "player2Id" TEXT,
    CONSTRAINT "Race_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Race_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Race_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Race" ("cup", "groupId", "id", "status", "track") SELECT "cup", "groupId", "id", "status", "track" FROM "Race";
DROP TABLE "Race";
ALTER TABLE "new_Race" RENAME TO "Race";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
