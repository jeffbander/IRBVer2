-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainName" TEXT NOT NULL,
    "chainRunId" TEXT NOT NULL,
    "documentId" TEXT,
    "studyId" TEXT,
    "requestedBy" TEXT,
    "requestData" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhookPayload" TEXT,
    "agentResponse" TEXT,
    "agentReceivedAt" DATETIME,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationLog_chainRunId_key" ON "AutomationLog"("chainRunId");

-- CreateIndex
CREATE INDEX "AutomationLog_chainRunId_idx" ON "AutomationLog"("chainRunId");

-- CreateIndex
CREATE INDEX "AutomationLog_documentId_idx" ON "AutomationLog"("documentId");

-- CreateIndex
CREATE INDEX "AutomationLog_studyId_idx" ON "AutomationLog"("studyId");

-- CreateIndex
CREATE INDEX "AutomationLog_isCompleted_idx" ON "AutomationLog"("isCompleted");

-- CreateIndex
CREATE INDEX "AutomationLog_status_idx" ON "AutomationLog"("status");

-- CreateIndex
CREATE INDEX "AutomationLog_createdAt_idx" ON "AutomationLog"("createdAt");
