/**
 * Automation Logs Storage Service
 * Handles CRUD operations for automation logs (webhook tracking)
 */

import { prisma } from './prisma';

export interface CreateAutomationLogParams {
  chainName: string;
  chainRunId: string;
  documentId?: string;
  studyId?: string;
  requestedBy?: string;
  requestData?: any;
}

export interface UpdateAutomationLogParams {
  webhookPayload?: any;
  agentResponse?: string;
  status?: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  isCompleted?: boolean;
}

/**
 * Create a new automation log when triggering Aigents
 */
export async function createAutomationLog(params: CreateAutomationLogParams) {
  const {
    chainName,
    chainRunId,
    documentId,
    studyId,
    requestedBy,
    requestData,
  } = params;

  return await prisma.automationLog.create({
    data: {
      chainName,
      chainRunId,
      documentId,
      studyId,
      requestedBy,
      requestData: requestData ? JSON.stringify(requestData) : null,
      status: 'processing',
      isCompleted: false,
    },
  });
}

/**
 * Update automation log when webhook is received
 * This is THE KEY function - finds log by Chain Run ID and updates with response
 */
export async function updateAutomationLogByChainRunId(
  chainRunId: string,
  params: UpdateAutomationLogParams
) {
  const {
    webhookPayload,
    agentResponse,
    status,
    errorMessage,
    isCompleted,
  } = params;

  // Find existing log by chainRunId
  const existingLog = await prisma.automationLog.findUnique({
    where: { chainRunId },
  });

  if (!existingLog) {
    console.error(`No automation log found for Chain Run ID: ${chainRunId}`);
    return null;
  }

  // Update with webhook response
  return await prisma.automationLog.update({
    where: { chainRunId },
    data: {
      webhookPayload: webhookPayload ? JSON.stringify(webhookPayload) : undefined,
      agentResponse,
      agentReceivedAt: new Date(),
      status: status || 'completed',
      errorMessage,
      isCompleted: isCompleted !== undefined ? isCompleted : true,
    },
  });
}

/**
 * Get automation log by Chain Run ID
 */
export async function getAutomationLogByChainRunId(chainRunId: string) {
  return await prisma.automationLog.findUnique({
    where: { chainRunId },
    include: {
      document: {
        include: {
          study: true,
        },
      },
    },
  });
}

/**
 * Get automation log by document ID
 */
export async function getAutomationLogByDocumentId(documentId: string) {
  return await prisma.automationLog.findFirst({
    where: { documentId },
    orderBy: { createdAt: 'desc' }, // Get most recent
  });
}

/**
 * Get all automation logs for a study
 */
export async function getAutomationLogsByStudyId(studyId: string) {
  return await prisma.automationLog.findMany({
    where: { studyId },
    orderBy: { createdAt: 'desc' },
    include: {
      document: true,
    },
  });
}

/**
 * Get all automation logs (for admin view)
 */
export async function getAllAutomationLogs(limit = 100) {
  return await prisma.automationLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      document: {
        include: {
          study: true,
          uploadedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get pending (incomplete) automation logs
 */
export async function getPendingAutomationLogs() {
  return await prisma.automationLog.findMany({
    where: {
      isCompleted: false,
      status: 'processing',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      document: true,
    },
  });
}

/**
 * Mark automation log as failed
 */
export async function markAutomationLogAsFailed(
  chainRunId: string,
  errorMessage: string
) {
  return await updateAutomationLogByChainRunId(chainRunId, {
    status: 'failed',
    errorMessage,
    isCompleted: true,
  });
}
