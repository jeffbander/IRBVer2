import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest, checkPermission, getPaginationParams } from '@/lib/middleware';
import { errorResponse } from '@/lib/errors';
import { rateLimiters } from '@/lib/rate-limit';
import { cors, handlePreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

// GET all audit logs (admin only, with filtering and pagination)
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimited = await rateLimiters.readOnly(request);
  if (rateLimited) return rateLimited;

  try {
    // Authenticate and check admin permission
    const user = authenticateRequest(request);
    checkPermission(user, 'view_audit_logs');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entity = searchParams.get('entity');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Pagination
    const { skip, take } = getPaginationParams(request);

    // Build where clause
    const where: any = {};

    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (action) where.action = { contains: action };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get audit logs with user info
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    const response = NextResponse.json({
      logs,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take)
      }
    });

    return cors(request, response);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch audit logs');
  }
}
