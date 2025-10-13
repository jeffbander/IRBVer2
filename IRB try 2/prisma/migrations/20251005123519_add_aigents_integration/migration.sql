-- AlterTable
ALTER TABLE "Document" ADD COLUMN "aigentsAnalysis" TEXT;
ALTER TABLE "Document" ADD COLUMN "aigentsChainName" TEXT;
ALTER TABLE "Document" ADD COLUMN "aigentsCompletedAt" DATETIME;
ALTER TABLE "Document" ADD COLUMN "aigentsError" TEXT;
ALTER TABLE "Document" ADD COLUMN "aigentsRunId" TEXT;
ALTER TABLE "Document" ADD COLUMN "aigentsStatus" TEXT;
ALTER TABLE "Document" ADD COLUMN "aigentstartedAt" DATETIME;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Document_aigentsRunId_idx" ON "Document"("aigentsRunId");

-- CreateIndex
CREATE INDEX "Document_aigentsStatus_idx" ON "Document"("aigentsStatus");

-- CreateIndex
CREATE INDEX "Study_status_idx" ON "Study"("status");

-- CreateIndex
CREATE INDEX "Study_type_idx" ON "Study"("type");

-- CreateIndex
CREATE INDEX "Study_principalInvestigatorId_idx" ON "Study"("principalInvestigatorId");

-- CreateIndex
CREATE INDEX "Study_reviewerId_idx" ON "Study"("reviewerId");

-- CreateIndex
CREATE INDEX "Study_createdAt_idx" ON "Study"("createdAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");
