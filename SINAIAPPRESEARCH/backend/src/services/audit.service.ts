import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../repositories/prismaClient';

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  try {
    const json = JSON.parse(JSON.stringify(value));
    if (json === null) {
      return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    }
    return json as Prisma.InputJsonValue;
  } catch (_error) {
    return undefined;
  }
};

interface RecordAuditParams {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  before?: unknown;
  after?: unknown;
  request?: Request;
}

export const recordAuditEvent = async ({
  action,
  entityType,
  entityId,
  actorId,
  before,
  after,
  request,
}: RecordAuditParams) => {
  const beforeJson = toJsonValue(before);
  const afterJson = toJsonValue(after);

  await prisma.auditEvent.create({
    data: {
      action,
      entityType,
      entityId,
      actorId: actorId ?? null,
      ipAddress: request?.ip ?? null,
      userAgent: request?.headers['user-agent'] ?? null,
      ...(beforeJson !== undefined ? { before: beforeJson } : {}),
      ...(afterJson !== undefined ? { after: afterJson } : {}),
    },
  });
};
