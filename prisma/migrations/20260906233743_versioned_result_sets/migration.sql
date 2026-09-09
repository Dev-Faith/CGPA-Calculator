/*
  Warnings:

  - Existing records are retained as version 1 drafts. Their `updatedAt`
    timestamp is initialized during the copy below.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResultSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "departmentId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "ResultSet_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResultSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ResultSet" ("departmentId", "id", "level", "semester", "sessionId", "uploadedAt", "updatedAt") SELECT "departmentId", "id", "level", "semester", "sessionId", "uploadedAt", CURRENT_TIMESTAMP FROM "ResultSet";
DROP TABLE "ResultSet";
ALTER TABLE "new_ResultSet" RENAME TO "ResultSet";
CREATE INDEX "ResultSet_departmentId_sessionId_semester_status_idx" ON "ResultSet"("departmentId", "sessionId", "semester", "status");
CREATE UNIQUE INDEX "ResultSet_departmentId_sessionId_semester_version_key" ON "ResultSet"("departmentId", "sessionId", "semester", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
