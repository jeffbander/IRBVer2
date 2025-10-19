import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canEditStudy, canViewStudy } from '@/lib/permissions';
import { logStudyAction, getClientIp, getUserAgent } from '@/lib/audit';
import { verifyToken } from '@/lib/auth';
// GET single study
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      });

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can view this study
    const canView = await canViewStudy(currentUser.id, params.id);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const study = await prisma.study.findUnique({
      where: { id: params.id },
      include: {
        principalInvestigator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
          select: {
            id: true,
            participantId: true,
            subjectId: true,
            status: true,
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        studyCoordinators: {
          where: { active: true },
          include: {
            coordinator: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: { participants: true, documents: true, enrollments: true }
        }
      },
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    return NextResponse.json(study);
  } catch (error) {
    console.error('Error fetching study:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PUT update study
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      });

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can edit this study
    const canEdit = await canEditStudy(currentUser.id, params.id);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing study for audit trail
    const existingStudy = await prisma.study.findUnique({
      where: { id: params.id },
    });

    if (!existingStudy) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      protocolNumber,
      description,
      type,
      riskLevel,
      startDate,
      endDate,
      targetEnrollment,
      irbApprovalDate,
      irbExpirationDate,
      reviewerId,
    } = body;

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (protocolNumber !== undefined) updateData.protocolNumber = protocolNumber;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (targetEnrollment !== undefined) updateData.targetEnrollment = targetEnrollment;
    if (irbApprovalDate !== undefined)
      updateData.irbApprovalDate = irbApprovalDate ? new Date(irbApprovalDate) : null;
    if (irbExpirationDate !== undefined)
      updateData.irbExpirationDate = irbExpirationDate ? new Date(irbExpirationDate) : null;
    if (reviewerId !== undefined) updateData.reviewerId = reviewerId;

    // Update study
    const updatedStudy = await prisma.study.update({
      where: { id: params.id },
      data: updateData,
      include: {
        principalInvestigator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Prepare old and new values for audit log
    const oldValues = {
      title: existingStudy.title,
      protocolNumber: existingStudy.protocolNumber,
      description: existingStudy.description,
      type: existingStudy.type,
      riskLevel: existingStudy.riskLevel,
      startDate: existingStudy.startDate?.toISOString(),
      endDate: existingStudy.endDate?.toISOString(),
      targetEnrollment: existingStudy.targetEnrollment,
      irbApprovalDate: existingStudy.irbApprovalDate?.toISOString(),
      irbExpirationDate: existingStudy.irbExpirationDate?.toISOString(),
      reviewerId: existingStudy.reviewerId,
    };

    const newValues = {
      title: updatedStudy.title,
      protocolNumber: updatedStudy.protocolNumber,
      description: updatedStudy.description,
      type: updatedStudy.type,
      riskLevel: updatedStudy.riskLevel,
      startDate: updatedStudy.startDate?.toISOString(),
      endDate: updatedStudy.endDate?.toISOString(),
      targetEnrollment: updatedStudy.targetEnrollment,
      irbApprovalDate: updatedStudy.irbApprovalDate?.toISOString(),
      irbExpirationDate: updatedStudy.irbExpirationDate?.toISOString(),
      reviewerId: updatedStudy.reviewerId,
    };

    // Log the action
    await logStudyAction({
      userId: currentUser.id,
      action: 'UPDATE',
      studyId: updatedStudy.id,
      studyTitle: updatedStudy.title,
      oldValues,
      newValues,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return NextResponse.json(updatedStudy);
  } catch (error) {
    console.error('Error updating study:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update study (alias for PUT)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

// DELETE study
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only admins can delete studies
    if (currentUser.role.name !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const study = await prisma.study.findUnique({
      where: { id: params.id },
      select: { title: true },
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    await prisma.study.delete({
      where: { id: params.id }
    });

    // Log audit event
    await logStudyAction({
      userId: currentUser.id,
      action: 'DELETE',
      studyId: params.id,
      studyTitle: study.title,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return NextResponse.json({ message: 'Study deleted successfully' });
  } catch (error) {
    console.error('Error deleting study:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}