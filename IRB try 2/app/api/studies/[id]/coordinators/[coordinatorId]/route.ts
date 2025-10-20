import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/middleware';
import { canManageCoordinators } from '@/lib/permissions';
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
 * DELETE /api/studies/[id]/coordinators/[coordinatorId]
 * Remove a coordinator assignment from a study (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; coordinatorId: string } }
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
          { error: 'Only the PI or admins can remove coordinators' },
          { status: 403 }
        )
      );
    }

    // Check if assignment exists
    const assignment = await prisma.studyCoordinator.findFirst({
      where: {
        studyId: params.id,
        coordinatorId: params.coordinatorId,
        active: true,
      },
      include: {
        coordinator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!assignment) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Coordinator assignment not found or already removed' },
          { status: 404 }
        )
      );
    }

    // Soft delete by setting active to false
    await prisma.studyCoordinator.updateMany({
      where: {
        studyId: params.id,
        coordinatorId: params.coordinatorId,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // Get study title for audit log
    const study = await prisma.study.findUnique({
      where: { id: params.id },
      select: { title: true },
    });

    // Log audit event
    await logStudyAction({
      userId: user.userId,
      action: 'REMOVE_COORDINATOR',
      studyId: params.id,
      studyTitle: study?.title || 'Unknown Study',
      oldValues: {
        coordinatorId: params.coordinatorId,
        coordinatorName: `${assignment.coordinator.firstName} ${assignment.coordinator.lastName}`,
        assignmentId: assignment.id,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return cors(
      request,
      NextResponse.json({
        success: true,
        message: 'Coordinator removed from study',
      })
    );
  } catch (error: any) {
    console.error('Error removing coordinator:', error);
    return cors(
      request,
      NextResponse.json(
        { error: 'Failed to remove coordinator', details: error.message },
        { status: 500 }
      )
    );
  }
}
