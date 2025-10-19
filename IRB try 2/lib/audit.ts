import { prisma } from '@/lib/prisma';
import { Headers } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * Audit logging utilities for tracking system actions
 */

interface LogStudyActionParams {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SUBMIT' | 'VIEW';
  studyId: string;
  studyTitle?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a study-related action to the audit log
 */
export async function logStudyAction(params: LogStudyActionParams): Promise<void> {
  try {
    const {
      userId,
      action,
      studyId,
      studyTitle,
      oldValues,
      newValues,
      changes,
      ipAddress,
      userAgent,
      metadata,
    } = params;

    // Calculate changes if not provided
    let calculatedChanges = changes;
    if (!calculatedChanges && oldValues && newValues) {
      calculatedChanges = {};
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          calculatedChanges[key] = {
            from: oldValues[key],
            to: newValues[key],
          };
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: 'Study',
        entityId: studyId,
        entityName: studyTitle,
        oldValues: oldValues || null,
        newValues: newValues || null,
        changes: calculatedChanges || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: metadata || null,
      },
    });
  } catch (error) {
    console.error('Error logging study action:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

interface LogUserActionParams {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'DEACTIVATE';
  targetUserId: string;
  targetUserEmail?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a user-related action to the audit log
 */
export async function logUserAction(params: LogUserActionParams): Promise<void> {
  try {
    const {
      userId,
      action,
      targetUserId,
      targetUserEmail,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      metadata,
    } = params;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: 'User',
        entityId: targetUserId,
        entityName: targetUserEmail,
        oldValues: oldValues || null,
        newValues: newValues || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: metadata || null,
      },
    });
  } catch (error) {
    console.error('Error logging user action:', error);
  }
}

interface LogParticipantActionParams {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ENROLL' | 'WITHDRAW' | 'COMPLETE';
  participantId: string;
  participantSubjectId?: string;
  studyId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a participant-related action to the audit log
 */
export async function logParticipantAction(params: LogParticipantActionParams): Promise<void> {
  try {
    const {
      userId,
      action,
      participantId,
      participantSubjectId,
      studyId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      metadata,
    } = params;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: 'Participant',
        entityId: participantId,
        entityName: participantSubjectId,
        oldValues: oldValues || null,
        newValues: newValues || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: studyId ? { ...metadata, studyId } : metadata || null,
      },
    });
  } catch (error) {
    console.error('Error logging participant action:', error);
  }
}

interface LogDocumentActionParams {
  userId: string;
  action: 'UPLOAD' | 'UPDATE' | 'DELETE' | 'ANALYZE' | 'APPROVE' | 'REJECT';
  documentId: string;
  documentName?: string;
  studyId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a document-related action to the audit log
 */
export async function logDocumentAction(params: LogDocumentActionParams): Promise<void> {
  try {
    const { userId, action, documentId, documentName, studyId, ipAddress, userAgent, metadata } =
      params;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: 'Document',
        entityId: documentId,
        entityName: documentName,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: studyId ? { ...metadata, studyId } : metadata || null,
      },
    });
  } catch (error) {
    console.error('Error logging document action:', error);
  }
}

/**
 * Extract client IP address from request headers
 */
export function getClientIp(headers: Headers): string {
  // Try various headers that might contain the real IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to unknown
  return 'unknown';
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string {
  const userAgent = headers.get('user-agent');
  return userAgent || 'unknown';
}

/**
 * Generic audit log function for any entity
 */
export async function logAction(params: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        entityName: params.entityName || null,
        oldValues: params.oldValues || null,
        newValues: params.newValues || null,
        changes: params.changes || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: params.metadata || null,
      },
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
}
