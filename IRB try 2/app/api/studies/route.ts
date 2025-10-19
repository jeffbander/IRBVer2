import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateForm, studyValidationSchema } from '@/lib/validation';
import { authenticateRequest, checkPermission, getPaginationParams, getSortParams, getFilterParams } from '@/lib/middleware';
import { errorResponse, ValidationError } from '@/lib/errors';
import { cache, cacheKeys, invalidateCache } from '@/lib/cache';
import { sanitizeObject, sanitizeProtocolNumber, sanitizeString } from '@/lib/sanitize';
import { rateLimiters } from '@/lib/rate-limit';
import { cors, handlePreflight } from '@/lib/cors';
import { logStudyAction, getClientIp, getUserAgent } from '@/lib/audit';

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

// GET all studies (with filtering, pagination, caching)
export async function GET(request: NextRequest) {
  // Apply rate limiting for read operations
  const rateLimited = await rateLimiters.readOnly(request);
  if (rateLimited) return rateLimited;
  try {
    // Authenticate
    const user = authenticateRequest(request);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const piId = searchParams.get('piId');

    // Pagination
    const { skip, take } = getPaginationParams(request);

    // Sorting
    const orderBy = getSortParams(request, { createdAt: 'desc' });

    // Build cache key
    const cacheKey = cacheKeys.studies(`${user.userId}-${status}-${type}-${piId}-${skip}-${take}`);

    // Try to get from cache
    const studies = await cache.getOrSet(
      cacheKey,
      async () => {
        const where: any = {};

        // Filter based on user role
        if (user.role.name === 'researcher') {
          where.principalInvestigatorId = user.userId;
        } else if (user.role.name === 'reviewer') {
          where.OR = [
            { reviewerId: user.userId },
            { status: 'PENDING_REVIEW' }
          ];
        } else if (user.role.name === 'coordinator') {
          // Coordinators only see assigned studies
          const assignments = await prisma.studyCoordinator.findMany({
            where: {
              coordinatorId: user.userId,
              active: true,
            },
            select: { studyId: true },
          });
          where.id = { in: assignments.map((a) => a.studyId) };
        }

        if (status) where.status = status;
        if (type) where.type = type;
        if (piId) where.principalInvestigatorId = piId;

        return await prisma.study.findMany({
          where,
          skip,
          take,
          include: {
            principalInvestigator: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            reviewer: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            _count: {
              select: { participants: true, documents: true }
            }
          },
          orderBy
        });
      },
      300000 // Cache for 5 minutes
    );

    const response = NextResponse.json(studies);
    return cors(request, response);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch studies');
  }
}

// POST create new study
export async function POST(request: NextRequest) {
  // Apply rate limiting for write operations
  const rateLimited = await rateLimiters.write(request);
  if (rateLimited) return rateLimited;
  try {
    // Authenticate
    const user = authenticateRequest(request);

    // Check permissions
    checkPermission(user, 'create_studies');

    // Get and sanitize data
    const rawData = await request.json();
    const data = sanitizeObject(rawData, {
      sanitizeStrings: true,
      trimStrings: true,
      removeEmpty: false
    });

    // Sanitize specific fields
    data.title = sanitizeString(data.title);
    data.protocolNumber = sanitizeProtocolNumber(data.protocolNumber);
    data.description = sanitizeString(data.description);

    // Validate input data
    const validation = validateForm(data, studyValidationSchema);
    if (!validation.isValid) {
      throw new ValidationError('Validation failed', validation.errors);
    }

    const study = await prisma.study.create({
      data: {
        title: data.title,
        protocolNumber: data.protocolNumber,
        principalInvestigatorId: user.userId,
        status: 'DRAFT',
        type: data.type,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        targetEnrollment: data.targetEnrollment,
        riskLevel: data.riskLevel || 'MINIMAL',
      },
      include: {
        principalInvestigator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Log audit event
    await logStudyAction({
      userId: user.userId,
      action: 'CREATE',
      studyId: study.id,
      studyTitle: study.title,
      newValues: {
        title: study.title,
        protocolNumber: study.protocolNumber,
        type: study.type,
        riskLevel: study.riskLevel,
        status: study.status,
      },
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    // Invalidate cache
    invalidateCache.study(study.id);

    const response = NextResponse.json(study, { status: 201 });
    return cors(request, response);
  } catch (error: any) {
    return errorResponse(error, 'Failed to create study');
  }
}