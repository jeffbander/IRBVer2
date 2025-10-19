import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canViewAuditLogs } from '@/lib/permissions';
import { verifyToken } from '@/lib/auth';

// GET all audit logs (with filtering and pagination)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check if user can view audit logs
    const canView = await canViewAuditLogs(
      currentUser.id,
      entity || undefined,
      entityId || undefined
    );

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause
    const where: any = {};

    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // If non-admin, filter to only logs they have access to
    if (currentUser.role.name !== 'admin') {
      // For coordinators, only show logs for their assigned studies
      if (currentUser.role.name === 'coordinator') {
        const assignments = await prisma.studyCoordinator.findMany({
          where: {
            coordinatorId: currentUser.id,
            active: true,
          },
          select: { studyId: true },
        });

        const studyIds = assignments.map((a) => a.studyId);

        // Show logs for their studies or participants in their studies
        where.OR = [
          {
            entity: 'Study',
            entityId: { in: studyIds },
          },
          {
            entity: 'Participant',
            entityId: {
              in: (
                await prisma.participant.findMany({
                  where: { studyId: { in: studyIds } },
                  select: { id: true },
                })
              ).map((p) => p.id),
            },
          },
        ];
      }
      // For researchers, show logs for their studies
      else if (currentUser.role.name === 'researcher') {
        const studies = await prisma.study.findMany({
          where: { principalInvestigatorId: currentUser.id },
          select: { id: true },
        });

        const studyIds = studies.map((s) => s.id);

        where.OR = [
          {
            entity: 'Study',
            entityId: { in: studyIds },
          },
          {
            entity: 'Participant',
            entityId: {
              in: (
                await prisma.participant.findMany({
                  where: { studyId: { in: studyIds } },
                  select: { id: true },
                })
              ).map((p) => p.id),
            },
          },
        ];
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get paginated logs
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
