/*
  Warnings:

  - You are about to drop the column `details` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to alter the column `version` on the `Document` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "StudyCoordinator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyCoordinator_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudyCoordinator_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "visitName" TEXT NOT NULL,
    "visitType" TEXT NOT NULL,
    "windowDays" INTEGER,
    "description" TEXT,
    "expectedPayment" REAL,
    "procedures" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyVisit_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParticipantVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "studyVisitId" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "completedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "paymentIssued" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmount" REAL,
    "clinicalData" TEXT,
    "coordinatorId" TEXT,
    "schedulingMethod" TEXT DEFAULT 'manual',
    "schedulingScore" REAL,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "checkInTime" DATETIME,
    "checkOutTime" DATETIME,
    "waitTime" INTEGER,
    "noShowReason" TEXT,
    "rescheduledFrom" TEXT,
    "rescheduledTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParticipantVisit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipantVisit_studyVisitId_fkey" FOREIGN KEY ("studyVisitId") REFERENCES "StudyVisit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipantVisit_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "studyMetadata" TEXT,
    "executiveSummary" TEXT,
    "complexityScore" INTEGER,
    "complianceScore" INTEGER,
    "riskLevel" TEXT,
    "processingTimeMs" INTEGER,
    "errorMessage" TEXT,
    "embedding" TEXT,
    "embeddingModel" TEXT,
    "embeddingCreated" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiAnalysis_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiAnalysisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "logicOperator" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Criterion_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisitSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiAnalysisId" TEXT NOT NULL,
    "visitName" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "dayRange" TEXT NOT NULL,
    "procedures" TEXT NOT NULL,
    "duration" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitSchedule_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetEstimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiAnalysisId" TEXT NOT NULL,
    "totalEstimate" REAL NOT NULL,
    "perParticipantCost" REAL NOT NULL,
    "breakdown" TEXT NOT NULL,
    "assumptions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BudgetEstimate_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiAnalysisId" TEXT NOT NULL,
    "regulation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "recommendation" TEXT,
    "severity" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceCheck_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProtocolSimilarity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiAnalysisId" TEXT NOT NULL,
    "similarStudyId" TEXT NOT NULL,
    "similarityScore" REAL NOT NULL,
    "matchingAspects" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProtocolSimilarity_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProtocolSimilarity_similarStudyId_fkey" FOREIGN KEY ("similarStudyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiAnalysisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "correctedData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFeedback_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "AiAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricalMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricValue" REAL NOT NULL,
    "timeframe" TEXT NOT NULL,
    "phase" TEXT,
    "therapeuticArea" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProtocolComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProtocolVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changes" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeNotes" TEXT,
    "previousVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CollaborationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "activeUsers" TEXT NOT NULL,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CoordinatorAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinatorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoordinatorAvailability_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeOffRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinatorId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeOffRequest_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "equipment" TEXT,
    "hoursOfOp" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FacilityBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "participantVisit" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "purpose" TEXT NOT NULL,
    "bookedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FacilityBooking_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FacilityBooking_participantVisit_fkey" FOREIGN KEY ("participantVisit") REFERENCES "ParticipantVisit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnCallSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coordinatorId" TEXT NOT NULL,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnCallSchedule_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisitWaitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "studyVisitId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "preferences" TEXT,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisitWaitlist_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisitWaitlist_studyVisitId_fkey" FOREIGN KEY ("studyVisitId") REFERENCES "StudyVisit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchedulingMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricDate" DATETIME NOT NULL,
    "coordinatorId" TEXT,
    "studyId" TEXT,
    "scheduledVisits" INTEGER NOT NULL DEFAULT 0,
    "completedVisits" INTEGER NOT NULL DEFAULT 0,
    "cancelledVisits" INTEGER NOT NULL DEFAULT 0,
    "noShowVisits" INTEGER NOT NULL DEFAULT 0,
    "rescheduledVisits" INTEGER NOT NULL DEFAULT 0,
    "utilizationRate" REAL,
    "avgWaitTime" REAL,
    "avgVisitDuration" REAL,
    "avgSchedulingTime" REAL,
    "availableSlots" INTEGER NOT NULL DEFAULT 0,
    "bookedSlots" INTEGER NOT NULL DEFAULT 0,
    "capacityRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "entity", "entityId", "id", "ipAddress", "userId") SELECT "action", "createdAt", "entity", "entityId", "id", "ipAddress", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "approvalDate" DATETIME,
    "expirationDate" DATETIME,
    "ocrContent" TEXT,
    "ocrStatus" TEXT,
    "ocrError" TEXT,
    "ocrModel" TEXT,
    "ocrProcessedAt" DATETIME,
    "isOcrSupported" BOOLEAN NOT NULL DEFAULT false,
    "parentDocumentId" TEXT,
    "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
    "versionNotes" TEXT,
    "aigentsChainName" TEXT,
    "aigentsRunId" TEXT,
    "aigentsStatus" TEXT,
    "aigentsAnalysis" TEXT,
    "aigentstartedAt" DATETIME,
    "aigentsCompletedAt" DATETIME,
    "aigentsError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("aigentsAnalysis", "aigentsChainName", "aigentsCompletedAt", "aigentsError", "aigentsRunId", "aigentsStatus", "aigentstartedAt", "approvalDate", "createdAt", "description", "expirationDate", "filePath", "fileSize", "id", "mimeType", "name", "status", "studyId", "type", "updatedAt", "uploadedById", "version") SELECT "aigentsAnalysis", "aigentsChainName", "aigentsCompletedAt", "aigentsError", "aigentsRunId", "aigentsStatus", "aigentstartedAt", "approvalDate", "createdAt", "description", "expirationDate", "filePath", "fileSize", "id", "mimeType", "name", "status", "studyId", "type", "updatedAt", "uploadedById", coalesce("version", 1) AS "version" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_studyId_idx" ON "Document"("studyId");
CREATE INDEX "Document_parentDocumentId_idx" ON "Document"("parentDocumentId");
CREATE INDEX "Document_aigentsRunId_idx" ON "Document"("aigentsRunId");
CREATE INDEX "Document_aigentsStatus_idx" ON "Document"("aigentsStatus");
CREATE INDEX "Document_ocrStatus_idx" ON "Document"("ocrStatus");
CREATE INDEX "Document_isLatestVersion_idx" ON "Document"("isLatestVersion");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "email", "firstName", "id", "lastName", "password", "roleId", "updatedAt") SELECT "active", "createdAt", "email", "firstName", "id", "lastName", "password", "roleId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "User_active_idx" ON "User"("active");
CREATE INDEX "User_approved_idx" ON "User"("approved");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StudyCoordinator_studyId_idx" ON "StudyCoordinator"("studyId");

-- CreateIndex
CREATE INDEX "StudyCoordinator_coordinatorId_idx" ON "StudyCoordinator"("coordinatorId");

-- CreateIndex
CREATE INDEX "StudyCoordinator_active_idx" ON "StudyCoordinator"("active");

-- CreateIndex
CREATE UNIQUE INDEX "StudyCoordinator_studyId_coordinatorId_key" ON "StudyCoordinator"("studyId", "coordinatorId");

-- CreateIndex
CREATE INDEX "StudyVisit_studyId_idx" ON "StudyVisit"("studyId");

-- CreateIndex
CREATE INDEX "StudyVisit_visitNumber_idx" ON "StudyVisit"("visitNumber");

-- CreateIndex
CREATE INDEX "ParticipantVisit_participantId_idx" ON "ParticipantVisit"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantVisit_studyVisitId_idx" ON "ParticipantVisit"("studyVisitId");

-- CreateIndex
CREATE INDEX "ParticipantVisit_coordinatorId_idx" ON "ParticipantVisit"("coordinatorId");

-- CreateIndex
CREATE INDEX "ParticipantVisit_status_idx" ON "ParticipantVisit"("status");

-- CreateIndex
CREATE INDEX "ParticipantVisit_scheduledDate_idx" ON "ParticipantVisit"("scheduledDate");

-- CreateIndex
CREATE INDEX "ParticipantVisit_schedulingMethod_idx" ON "ParticipantVisit"("schedulingMethod");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysis_studyId_key" ON "AiAnalysis"("studyId");

-- CreateIndex
CREATE INDEX "AiAnalysis_studyId_idx" ON "AiAnalysis"("studyId");

-- CreateIndex
CREATE INDEX "AiAnalysis_status_idx" ON "AiAnalysis"("status");

-- CreateIndex
CREATE INDEX "AiAnalysis_createdAt_idx" ON "AiAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "Criterion_aiAnalysisId_idx" ON "Criterion"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "Criterion_type_idx" ON "Criterion"("type");

-- CreateIndex
CREATE INDEX "Criterion_category_idx" ON "Criterion"("category");

-- CreateIndex
CREATE INDEX "VisitSchedule_aiAnalysisId_idx" ON "VisitSchedule"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "VisitSchedule_visitNumber_idx" ON "VisitSchedule"("visitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetEstimate_aiAnalysisId_key" ON "BudgetEstimate"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "BudgetEstimate_aiAnalysisId_idx" ON "BudgetEstimate"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_aiAnalysisId_idx" ON "ComplianceCheck"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_regulation_idx" ON "ComplianceCheck"("regulation");

-- CreateIndex
CREATE INDEX "ComplianceCheck_status_idx" ON "ComplianceCheck"("status");

-- CreateIndex
CREATE INDEX "ComplianceCheck_severity_idx" ON "ComplianceCheck"("severity");

-- CreateIndex
CREATE INDEX "ProtocolSimilarity_aiAnalysisId_idx" ON "ProtocolSimilarity"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ProtocolSimilarity_similarStudyId_idx" ON "ProtocolSimilarity"("similarStudyId");

-- CreateIndex
CREATE INDEX "ProtocolSimilarity_similarityScore_idx" ON "ProtocolSimilarity"("similarityScore");

-- CreateIndex
CREATE INDEX "UserFeedback_aiAnalysisId_idx" ON "UserFeedback"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

-- CreateIndex
CREATE INDEX "UserFeedback_feedbackType_idx" ON "UserFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "UserFeedback_rating_idx" ON "UserFeedback"("rating");

-- CreateIndex
CREATE INDEX "HistoricalMetric_studyId_idx" ON "HistoricalMetric"("studyId");

-- CreateIndex
CREATE INDEX "HistoricalMetric_metricType_idx" ON "HistoricalMetric"("metricType");

-- CreateIndex
CREATE INDEX "HistoricalMetric_timeframe_idx" ON "HistoricalMetric"("timeframe");

-- CreateIndex
CREATE INDEX "HistoricalMetric_phase_idx" ON "HistoricalMetric"("phase");

-- CreateIndex
CREATE INDEX "HistoricalMetric_therapeuticArea_idx" ON "HistoricalMetric"("therapeuticArea");

-- CreateIndex
CREATE INDEX "ProtocolComment_studyId_idx" ON "ProtocolComment"("studyId");

-- CreateIndex
CREATE INDEX "ProtocolComment_userId_idx" ON "ProtocolComment"("userId");

-- CreateIndex
CREATE INDEX "ProtocolComment_resolved_idx" ON "ProtocolComment"("resolved");

-- CreateIndex
CREATE INDEX "ProtocolComment_section_idx" ON "ProtocolComment"("section");

-- CreateIndex
CREATE INDEX "ProtocolVersion_studyId_idx" ON "ProtocolVersion"("studyId");

-- CreateIndex
CREATE INDEX "ProtocolVersion_versionNumber_idx" ON "ProtocolVersion"("versionNumber");

-- CreateIndex
CREATE INDEX "ProtocolVersion_createdAt_idx" ON "ProtocolVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolVersion_studyId_versionNumber_key" ON "ProtocolVersion"("studyId", "versionNumber");

-- CreateIndex
CREATE INDEX "CollaborationSession_lastActivity_idx" ON "CollaborationSession"("lastActivity");

-- CreateIndex
CREATE UNIQUE INDEX "CollaborationSession_studyId_key" ON "CollaborationSession"("studyId");

-- CreateIndex
CREATE INDEX "CoordinatorAvailability_coordinatorId_idx" ON "CoordinatorAvailability"("coordinatorId");

-- CreateIndex
CREATE INDEX "CoordinatorAvailability_dayOfWeek_idx" ON "CoordinatorAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "CoordinatorAvailability_effectiveFrom_idx" ON "CoordinatorAvailability"("effectiveFrom");

-- CreateIndex
CREATE INDEX "TimeOffRequest_coordinatorId_idx" ON "TimeOffRequest"("coordinatorId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_idx" ON "TimeOffRequest"("status");

-- CreateIndex
CREATE INDEX "TimeOffRequest_startDate_idx" ON "TimeOffRequest"("startDate");

-- CreateIndex
CREATE INDEX "TimeOffRequest_endDate_idx" ON "TimeOffRequest"("endDate");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE INDEX "Facility_active_idx" ON "Facility"("active");

-- CreateIndex
CREATE INDEX "Facility_location_idx" ON "Facility"("location");

-- CreateIndex
CREATE INDEX "FacilityBooking_facilityId_idx" ON "FacilityBooking"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityBooking_participantVisit_idx" ON "FacilityBooking"("participantVisit");

-- CreateIndex
CREATE INDEX "FacilityBooking_startTime_idx" ON "FacilityBooking"("startTime");

-- CreateIndex
CREATE INDEX "FacilityBooking_status_idx" ON "FacilityBooking"("status");

-- CreateIndex
CREATE INDEX "OnCallSchedule_coordinatorId_idx" ON "OnCallSchedule"("coordinatorId");

-- CreateIndex
CREATE INDEX "OnCallSchedule_startDateTime_idx" ON "OnCallSchedule"("startDateTime");

-- CreateIndex
CREATE INDEX "OnCallSchedule_scheduleType_idx" ON "OnCallSchedule"("scheduleType");

-- CreateIndex
CREATE INDEX "OnCallSchedule_priority_idx" ON "OnCallSchedule"("priority");

-- CreateIndex
CREATE INDEX "VisitWaitlist_studyVisitId_idx" ON "VisitWaitlist"("studyVisitId");

-- CreateIndex
CREATE INDEX "VisitWaitlist_participantId_idx" ON "VisitWaitlist"("participantId");

-- CreateIndex
CREATE INDEX "VisitWaitlist_priority_idx" ON "VisitWaitlist"("priority");

-- CreateIndex
CREATE INDEX "VisitWaitlist_contacted_idx" ON "VisitWaitlist"("contacted");

-- CreateIndex
CREATE INDEX "VisitWaitlist_addedAt_idx" ON "VisitWaitlist"("addedAt");

-- CreateIndex
CREATE INDEX "SchedulingMetric_metricDate_idx" ON "SchedulingMetric"("metricDate");

-- CreateIndex
CREATE INDEX "SchedulingMetric_coordinatorId_idx" ON "SchedulingMetric"("coordinatorId");

-- CreateIndex
CREATE INDEX "SchedulingMetric_studyId_idx" ON "SchedulingMetric"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingMetric_metricDate_coordinatorId_studyId_key" ON "SchedulingMetric"("metricDate", "coordinatorId", "studyId");
