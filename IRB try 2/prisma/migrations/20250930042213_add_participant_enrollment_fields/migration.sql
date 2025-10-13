/*
  Warnings:

  - Added the required column `subjectId` to the `Participant` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" DATETIME,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "consentDate" DATETIME,
    "consentVersion" TEXT,
    "enrollmentDate" DATETIME,
    "groupAssignment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCREENING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Participant_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Participant" ("address", "consentDate", "consentVersion", "createdAt", "dateOfBirth", "email", "firstName", "id", "lastName", "notes", "participantId", "phone", "status", "studyId", "updatedAt") SELECT "address", "consentDate", "consentVersion", "createdAt", "dateOfBirth", "email", "firstName", "id", "lastName", "notes", "participantId", "phone", "status", "studyId", "updatedAt" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
CREATE UNIQUE INDEX "Participant_participantId_key" ON "Participant"("participantId");
CREATE UNIQUE INDEX "Participant_studyId_subjectId_key" ON "Participant"("studyId", "subjectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
