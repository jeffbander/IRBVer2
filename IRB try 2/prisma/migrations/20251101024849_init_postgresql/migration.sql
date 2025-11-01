-- CreateEnum
CREATE TYPE "public"."StudyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."StudyType" AS ENUM ('INTERVENTIONAL', 'OBSERVATIONAL', 'REGISTRY', 'SURVEY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('MINIMAL', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ParticipantStatus" AS ENUM ('SCREENING', 'ENROLLED', 'ACTIVE', 'COMPLETED', 'WITHDRAWN', 'LOST_TO_FOLLOWUP');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'WITHDRAWN', 'TERMINATED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('PROTOCOL', 'CONSENT_FORM', 'AMENDMENT', 'APPROVAL_LETTER', 'ADVERSE_EVENT', 'PROGRESS_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Study" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "protocolNumber" TEXT NOT NULL,
    "principalInvestigatorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" "public"."StudyStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "public"."StudyType" NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetEnrollment" INTEGER,
    "currentEnrollment" INTEGER NOT NULL DEFAULT 0,
    "irbApprovalDate" TIMESTAMP(3),
    "irbExpirationDate" TIMESTAMP(3),
    "riskLevel" "public"."RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Participant" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "consentDate" TIMESTAMP(3),
    "consentVersion" TEXT,
    "enrollmentDate" TIMESTAMP(3),
    "groupAssignment" TEXT,
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'SCREENING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Enrollment" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolledById" TEXT NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "withdrawalDate" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "completionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "approvalDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "ocrContent" TEXT,
    "ocrStatus" TEXT,
    "ocrError" TEXT,
    "ocrModel" TEXT,
    "ocrProcessedAt" TIMESTAMP(3),
    "isOcrSupported" BOOLEAN NOT NULL DEFAULT false,
    "parentDocumentId" TEXT,
    "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
    "versionNotes" TEXT,
    "aigentsChainName" TEXT,
    "aigentsRunId" TEXT,
    "aigentsStatus" TEXT,
    "aigentsAnalysis" TEXT,
    "aigentstartedAt" TIMESTAMP(3),
    "aigentsCompletedAt" TIMESTAMP(3),
    "aigentsError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomationLog" (
    "id" TEXT NOT NULL,
    "chainName" TEXT NOT NULL,
    "chainRunId" TEXT NOT NULL,
    "documentId" TEXT,
    "studyId" TEXT,
    "requestedBy" TEXT,
    "requestData" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhookPayload" TEXT,
    "agentResponse" TEXT,
    "agentReceivedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudyCoordinator" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyCoordinator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudyVisit" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "visitName" TEXT NOT NULL,
    "visitType" TEXT NOT NULL,
    "windowDays" INTEGER,
    "description" TEXT,
    "expectedPayment" DOUBLE PRECISION,
    "procedures" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParticipantVisit" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "studyVisitId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "paymentIssued" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmount" DOUBLE PRECISION,
    "clinicalData" TEXT,
    "coordinatorId" TEXT,
    "schedulingMethod" TEXT DEFAULT 'manual',
    "schedulingScore" DOUBLE PRECISION,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "waitTime" INTEGER,
    "noShowReason" TEXT,
    "rescheduledFrom" TEXT,
    "rescheduledTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiAnalysis" (
    "id" TEXT NOT NULL,
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
    "embeddingCreated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Criterion" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "logicOperator" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VisitSchedule" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "visitName" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "dayRange" TEXT NOT NULL,
    "procedures" TEXT NOT NULL,
    "duration" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BudgetEstimate" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "totalEstimate" DOUBLE PRECISION NOT NULL,
    "perParticipantCost" DOUBLE PRECISION NOT NULL,
    "breakdown" TEXT NOT NULL,
    "assumptions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceCheck" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "regulation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "recommendation" TEXT,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProtocolSimilarity" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "similarStudyId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "matchingAspects" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserFeedback" (
    "id" TEXT NOT NULL,
    "aiAnalysisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "correctedData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HistoricalMetric" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "timeframe" TEXT NOT NULL,
    "phase" TEXT,
    "therapeuticArea" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProtocolComment" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProtocolVersion" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changes" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeNotes" TEXT,
    "previousVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollaborationSession" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "activeUsers" TEXT NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoordinatorAvailability" (
    "id" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoordinatorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeOffRequest" (
    "id" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "equipment" TEXT,
    "hoursOfOp" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilityBooking" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "participantVisit" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "bookedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OnCallSchedule" (
    "id" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VisitWaitlist" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "studyVisitId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "preferences" TEXT,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchedulingMetric" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "coordinatorId" TEXT,
    "studyId" TEXT,
    "scheduledVisits" INTEGER NOT NULL DEFAULT 0,
    "completedVisits" INTEGER NOT NULL DEFAULT 0,
    "cancelledVisits" INTEGER NOT NULL DEFAULT 0,
    "noShowVisits" INTEGER NOT NULL DEFAULT 0,
    "rescheduledVisits" INTEGER NOT NULL DEFAULT 0,
    "utilizationRate" DOUBLE PRECISION,
    "avgWaitTime" DOUBLE PRECISION,
    "avgVisitDuration" DOUBLE PRECISION,
    "avgSchedulingTime" DOUBLE PRECISION,
    "availableSlots" INTEGER NOT NULL DEFAULT 0,
    "bookedSlots" INTEGER NOT NULL DEFAULT 0,
    "capacityRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "public"."User"("roleId");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "public"."User"("active");

-- CreateIndex
CREATE INDEX "User_approved_idx" ON "public"."User"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Study_protocolNumber_key" ON "public"."Study"("protocolNumber");

-- CreateIndex
CREATE INDEX "Study_status_idx" ON "public"."Study"("status");

-- CreateIndex
CREATE INDEX "Study_type_idx" ON "public"."Study"("type");

-- CreateIndex
CREATE INDEX "Study_principalInvestigatorId_idx" ON "public"."Study"("principalInvestigatorId");

-- CreateIndex
CREATE INDEX "Study_reviewerId_idx" ON "public"."Study"("reviewerId");

-- CreateIndex
CREATE INDEX "Study_createdAt_idx" ON "public"."Study"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_participantId_key" ON "public"."Participant"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_studyId_subjectId_key" ON "public"."Participant"("studyId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studyId_participantId_key" ON "public"."Enrollment"("studyId", "participantId");

-- CreateIndex
CREATE INDEX "Document_studyId_idx" ON "public"."Document"("studyId");

-- CreateIndex
CREATE INDEX "Document_parentDocumentId_idx" ON "public"."Document"("parentDocumentId");

-- CreateIndex
CREATE INDEX "Document_aigentsRunId_idx" ON "public"."Document"("aigentsRunId");

-- CreateIndex
CREATE INDEX "Document_aigentsStatus_idx" ON "public"."Document"("aigentsStatus");

-- CreateIndex
CREATE INDEX "Document_ocrStatus_idx" ON "public"."Document"("ocrStatus");

-- CreateIndex
CREATE INDEX "Document_isLatestVersion_idx" ON "public"."Document"("isLatestVersion");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationLog_chainRunId_key" ON "public"."AutomationLog"("chainRunId");

-- CreateIndex
CREATE INDEX "AutomationLog_chainRunId_idx" ON "public"."AutomationLog"("chainRunId");

-- CreateIndex
CREATE INDEX "AutomationLog_documentId_idx" ON "public"."AutomationLog"("documentId");

-- CreateIndex
CREATE INDEX "AutomationLog_studyId_idx" ON "public"."AutomationLog"("studyId");

-- CreateIndex
CREATE INDEX "AutomationLog_isCompleted_idx" ON "public"."AutomationLog"("isCompleted");

-- CreateIndex
CREATE INDEX "AutomationLog_status_idx" ON "public"."AutomationLog"("status");

-- CreateIndex
CREATE INDEX "AutomationLog_createdAt_idx" ON "public"."AutomationLog"("createdAt");

-- CreateIndex
CREATE INDEX "StudyCoordinator_studyId_idx" ON "public"."StudyCoordinator"("studyId");

-- CreateIndex
CREATE INDEX "StudyCoordinator_coordinatorId_idx" ON "public"."StudyCoordinator"("coordinatorId");

-- CreateIndex
CREATE INDEX "StudyCoordinator_active_idx" ON "public"."StudyCoordinator"("active");

-- CreateIndex
CREATE UNIQUE INDEX "StudyCoordinator_studyId_coordinatorId_key" ON "public"."StudyCoordinator"("studyId", "coordinatorId");

-- CreateIndex
CREATE INDEX "StudyVisit_studyId_idx" ON "public"."StudyVisit"("studyId");

-- CreateIndex
CREATE INDEX "StudyVisit_visitNumber_idx" ON "public"."StudyVisit"("visitNumber");

-- CreateIndex
CREATE INDEX "ParticipantVisit_participantId_idx" ON "public"."ParticipantVisit"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantVisit_studyVisitId_idx" ON "public"."ParticipantVisit"("studyVisitId");

-- CreateIndex
CREATE INDEX "ParticipantVisit_coordinatorId_idx" ON "public"."ParticipantVisit"("coordinatorId");

-- CreateIndex
CREATE INDEX "ParticipantVisit_status_idx" ON "public"."ParticipantVisit"("status");

-- CreateIndex
CREATE INDEX "ParticipantVisit_scheduledDate_idx" ON "public"."ParticipantVisit"("scheduledDate");

-- CreateIndex
CREATE INDEX "ParticipantVisit_schedulingMethod_idx" ON "public"."ParticipantVisit"("schedulingMethod");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysis_studyId_key" ON "public"."AiAnalysis"("studyId");

-- CreateIndex
CREATE INDEX "AiAnalysis_studyId_idx" ON "public"."AiAnalysis"("studyId");

-- CreateIndex
CREATE INDEX "AiAnalysis_status_idx" ON "public"."AiAnalysis"("status");

-- CreateIndex
CREATE INDEX "AiAnalysis_createdAt_idx" ON "public"."AiAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "Criterion_aiAnalysisId_idx" ON "public"."Criterion"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "Criterion_type_idx" ON "public"."Criterion"("type");

-- CreateIndex
CREATE INDEX "Criterion_category_idx" ON "public"."Criterion"("category");

-- CreateIndex
CREATE INDEX "VisitSchedule_aiAnalysisId_idx" ON "public"."VisitSchedule"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "VisitSchedule_visitNumber_idx" ON "public"."VisitSchedule"("visitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetEstimate_aiAnalysisId_key" ON "public"."BudgetEstimate"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "BudgetEstimate_aiAnalysisId_idx" ON "public"."BudgetEstimate"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_aiAnalysisId_idx" ON "public"."ComplianceCheck"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_regulation_idx" ON "public"."ComplianceCheck"("regulation");

-- CreateIndex
CREATE INDEX "ComplianceCheck_status_idx" ON "public"."ComplianceCheck"("status");

-- CreateIndex
CREATE INDEX "ComplianceCheck_severity_idx" ON "public"."ComplianceCheck"("severity");

-- CreateIndex
CREATE INDEX "ProtocolSimilarity_aiAnalysisId_idx" ON "public"."ProtocolSimilarity"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "ProtocolSimilarity_similarStudyId_idx" ON "public"."ProtocolSimilarity"("similarStudyId");

-- CreateIndex
CREATE INDEX "ProtocolSimilarity_similarityScore_idx" ON "public"."ProtocolSimilarity"("similarityScore");

-- CreateIndex
CREATE INDEX "UserFeedback_aiAnalysisId_idx" ON "public"."UserFeedback"("aiAnalysisId");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "public"."UserFeedback"("userId");

-- CreateIndex
CREATE INDEX "UserFeedback_feedbackType_idx" ON "public"."UserFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "UserFeedback_rating_idx" ON "public"."UserFeedback"("rating");

-- CreateIndex
CREATE INDEX "HistoricalMetric_studyId_idx" ON "public"."HistoricalMetric"("studyId");

-- CreateIndex
CREATE INDEX "HistoricalMetric_metricType_idx" ON "public"."HistoricalMetric"("metricType");

-- CreateIndex
CREATE INDEX "HistoricalMetric_timeframe_idx" ON "public"."HistoricalMetric"("timeframe");

-- CreateIndex
CREATE INDEX "HistoricalMetric_phase_idx" ON "public"."HistoricalMetric"("phase");

-- CreateIndex
CREATE INDEX "HistoricalMetric_therapeuticArea_idx" ON "public"."HistoricalMetric"("therapeuticArea");

-- CreateIndex
CREATE INDEX "ProtocolComment_studyId_idx" ON "public"."ProtocolComment"("studyId");

-- CreateIndex
CREATE INDEX "ProtocolComment_userId_idx" ON "public"."ProtocolComment"("userId");

-- CreateIndex
CREATE INDEX "ProtocolComment_resolved_idx" ON "public"."ProtocolComment"("resolved");

-- CreateIndex
CREATE INDEX "ProtocolComment_section_idx" ON "public"."ProtocolComment"("section");

-- CreateIndex
CREATE INDEX "ProtocolVersion_studyId_idx" ON "public"."ProtocolVersion"("studyId");

-- CreateIndex
CREATE INDEX "ProtocolVersion_versionNumber_idx" ON "public"."ProtocolVersion"("versionNumber");

-- CreateIndex
CREATE INDEX "ProtocolVersion_createdAt_idx" ON "public"."ProtocolVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolVersion_studyId_versionNumber_key" ON "public"."ProtocolVersion"("studyId", "versionNumber");

-- CreateIndex
CREATE INDEX "CollaborationSession_lastActivity_idx" ON "public"."CollaborationSession"("lastActivity");

-- CreateIndex
CREATE UNIQUE INDEX "CollaborationSession_studyId_key" ON "public"."CollaborationSession"("studyId");

-- CreateIndex
CREATE INDEX "CoordinatorAvailability_coordinatorId_idx" ON "public"."CoordinatorAvailability"("coordinatorId");

-- CreateIndex
CREATE INDEX "CoordinatorAvailability_dayOfWeek_idx" ON "public"."CoordinatorAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "CoordinatorAvailability_effectiveFrom_idx" ON "public"."CoordinatorAvailability"("effectiveFrom");

-- CreateIndex
CREATE INDEX "TimeOffRequest_coordinatorId_idx" ON "public"."TimeOffRequest"("coordinatorId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_idx" ON "public"."TimeOffRequest"("status");

-- CreateIndex
CREATE INDEX "TimeOffRequest_startDate_idx" ON "public"."TimeOffRequest"("startDate");

-- CreateIndex
CREATE INDEX "TimeOffRequest_endDate_idx" ON "public"."TimeOffRequest"("endDate");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "public"."Facility"("type");

-- CreateIndex
CREATE INDEX "Facility_active_idx" ON "public"."Facility"("active");

-- CreateIndex
CREATE INDEX "Facility_location_idx" ON "public"."Facility"("location");

-- CreateIndex
CREATE INDEX "FacilityBooking_facilityId_idx" ON "public"."FacilityBooking"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityBooking_participantVisit_idx" ON "public"."FacilityBooking"("participantVisit");

-- CreateIndex
CREATE INDEX "FacilityBooking_startTime_idx" ON "public"."FacilityBooking"("startTime");

-- CreateIndex
CREATE INDEX "FacilityBooking_status_idx" ON "public"."FacilityBooking"("status");

-- CreateIndex
CREATE INDEX "OnCallSchedule_coordinatorId_idx" ON "public"."OnCallSchedule"("coordinatorId");

-- CreateIndex
CREATE INDEX "OnCallSchedule_startDateTime_idx" ON "public"."OnCallSchedule"("startDateTime");

-- CreateIndex
CREATE INDEX "OnCallSchedule_scheduleType_idx" ON "public"."OnCallSchedule"("scheduleType");

-- CreateIndex
CREATE INDEX "OnCallSchedule_priority_idx" ON "public"."OnCallSchedule"("priority");

-- CreateIndex
CREATE INDEX "VisitWaitlist_studyVisitId_idx" ON "public"."VisitWaitlist"("studyVisitId");

-- CreateIndex
CREATE INDEX "VisitWaitlist_participantId_idx" ON "public"."VisitWaitlist"("participantId");

-- CreateIndex
CREATE INDEX "VisitWaitlist_priority_idx" ON "public"."VisitWaitlist"("priority");

-- CreateIndex
CREATE INDEX "VisitWaitlist_contacted_idx" ON "public"."VisitWaitlist"("contacted");

-- CreateIndex
CREATE INDEX "VisitWaitlist_addedAt_idx" ON "public"."VisitWaitlist"("addedAt");

-- CreateIndex
CREATE INDEX "SchedulingMetric_metricDate_idx" ON "public"."SchedulingMetric"("metricDate");

-- CreateIndex
CREATE INDEX "SchedulingMetric_coordinatorId_idx" ON "public"."SchedulingMetric"("coordinatorId");

-- CreateIndex
CREATE INDEX "SchedulingMetric_studyId_idx" ON "public"."SchedulingMetric"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingMetric_metricDate_coordinatorId_studyId_key" ON "public"."SchedulingMetric"("metricDate", "coordinatorId", "studyId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Study" ADD CONSTRAINT "Study_principalInvestigatorId_fkey" FOREIGN KEY ("principalInvestigatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Study" ADD CONSTRAINT "Study_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_enrolledById_fkey" FOREIGN KEY ("enrolledById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationLog" ADD CONSTRAINT "AutomationLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudyCoordinator" ADD CONSTRAINT "StudyCoordinator_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudyCoordinator" ADD CONSTRAINT "StudyCoordinator_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudyVisit" ADD CONSTRAINT "StudyVisit_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticipantVisit" ADD CONSTRAINT "ParticipantVisit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticipantVisit" ADD CONSTRAINT "ParticipantVisit_studyVisitId_fkey" FOREIGN KEY ("studyVisitId") REFERENCES "public"."StudyVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticipantVisit" ADD CONSTRAINT "ParticipantVisit_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiAnalysis" ADD CONSTRAINT "AiAnalysis_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Criterion" ADD CONSTRAINT "Criterion_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "public"."AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitSchedule" ADD CONSTRAINT "VisitSchedule_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "public"."AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BudgetEstimate" ADD CONSTRAINT "BudgetEstimate_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "public"."AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "public"."AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProtocolSimilarity" ADD CONSTRAINT "ProtocolSimilarity_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "public"."AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProtocolSimilarity" ADD CONSTRAINT "ProtocolSimilarity_similarStudyId_fkey" FOREIGN KEY ("similarStudyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFeedback" ADD CONSTRAINT "UserFeedback_aiAnalysisId_fkey" FOREIGN KEY ("aiAnalysisId") REFERENCES "public"."AiAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoordinatorAvailability" ADD CONSTRAINT "CoordinatorAvailability_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityBooking" ADD CONSTRAINT "FacilityBooking_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilityBooking" ADD CONSTRAINT "FacilityBooking_participantVisit_fkey" FOREIGN KEY ("participantVisit") REFERENCES "public"."ParticipantVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OnCallSchedule" ADD CONSTRAINT "OnCallSchedule_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitWaitlist" ADD CONSTRAINT "VisitWaitlist_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitWaitlist" ADD CONSTRAINT "VisitWaitlist_studyVisitId_fkey" FOREIGN KEY ("studyVisitId") REFERENCES "public"."StudyVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
