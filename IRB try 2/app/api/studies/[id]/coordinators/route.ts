import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/middleware';
import { canViewStudy, canManageCoordinators } from '@/lib/permissions';
import { rateLimiters } from '@/lib/rate-limit';
import { cors, handlePreflight } from '@/lib/cors';
import { logStudyAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

/**
 * GET /api/studies/[id]/coordinators
 * List all coordinators assigned to a study
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimited = await rateLimiters.readOnly(request);
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);

    // Check permission to view study
    const hasPermission = await canViewStudy(user.userId, params.id);
    if (!hasPermission) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Unauthorized to view this study' },
          { status: 403 }
        )
      );
    }

    // Fetch all active coordinator assignments
    const coordinators = await prisma.studyCoordinator.findMany({
      where: {
        studyId: params.id,
        active: true,
      },
      include: {
        coordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            active: true,
            approved: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    // Transform data for response
    const response = coordinators.map((assignment) => ({
      id: assignment.id,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      coordinator: {
        id: assignment.coordinator.id,
        firstName: assignment.coordinator.firstName,
        lastName: assignment.coordinator.lastName,
        email: assignment.coordinator.email,
        active: assignment.coordinator.active,
        approved: assignment.coordinator.approved,
      },
    }));

    return cors(request, NextResponse.json(response));
  } catch (error: any) {
    console.error('Error fetching study coordinators:', error);
    return cors(
      request,
      NextResponse.json(
        { error: 'Failed to fetch coordinators', details: error.message },
        { status: 500 }
      )
    );
  }
}

/**
 * POST /api/studies/[id]/coordinators
 * Assign a coordinator to a study
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimited = await rateLimiters.modify(request);
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);

    // Check if user can manage coordinators for this study
    const canManage = await canManageCoordinators(user.userId, params.id);
    if (!canManage) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Only the PI or admins can assign coordinators' },
          { status: 403 }
        )
      );
    }

    const body = await request.json();
    const { coordinatorId } = body;

    if (!coordinatorId) {
      return cors(
        request,
        NextResponse.json(
          { error: 'coordinatorId is required' },
          { status: 400 }
        )
      );
    }

    // Validate coordinator exists and has coordinator role
    const coordinator = await prisma.user.findUnique({
      where: { id: coordinatorId },
      include: { role: true },
    });

    if (!coordinator) {
      return cors(
        request,
        NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      );
    }

    if (coordinator.role.name !== 'coordinator') {
      return cors(
        request,
        NextResponse.json(
          { error: 'User must have coordinator role' },
          { status: 400 }
        )
      );
    }

    if (!coordinator.active || !coordinator.approved) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Coordinator must be active and approved' },
          { status: 400 }
        )
      );
    }

    // Validate study exists
    const study = await prisma.study.findUnique({
      where: { id: params.id },
    });

    if (!study) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Study not found' },
          { status: 404 }
        )
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.studyCoordinator.findFirst({
      where: {
        studyId: params.id,
        coordinatorId: coordinatorId,
        active: true,
      },
    });

    if (existingAssignment) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Coordinator is already assigned to this study' },
          { status: 400 }
        )
      );
    }

    // Create assignment
    const assignment = await prisma.studyCoordinator.create({
      data: {
        studyId: params.id,
        coordinatorId: coordinatorId,
        assignedBy: user.userId,
        active: true,
      },
      include: {
        coordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit event
    await logStudyAction({
      userId: user.userId,
      action: 'ASSIGN_COORDINATOR',
      studyId: params.id,
      studyTitle: study.title,
      newValues: {
        coordinatorId,
        coordinatorName: `${coordinator.firstName} ${coordinator.lastName}`,
        assignmentId: assignment.id,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return cors(
      request,
      NextResponse.json(
        {
          id: assignment.id,
          assignedAt: assignment.assignedAt,
          assignedBy: assignment.assignedBy,
          coordinator: assignment.coordinator,
        },
        { status: 201 }
      )
    );
  } catch (error: any) {
    console.error('Error assigning coordinator:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return cors(
        request,
        NextResponse.json(
          { error: 'Coordinator is already assigned to this study' },
          { status: 400 }
        )
      );
    }

    return cors(
      request,
      NextResponse.json(
        { error: 'Failed to assign coordinator', details: error.message },
        { status: 500 }
      )
    );
  }
}
