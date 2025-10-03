import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET single study
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    verifyToken(token);

    const study = await prisma.study.findUnique({
      where: { id: params.id },
      include: {
        principalInvestigator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        participants: true,
        documents: true,
        _count: {
          select: { participants: true, documents: true, enrollments: true }
        }
      }
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const data = await request.json();

    // Check if study exists and user has permission
    const existingStudy = await prisma.study.findUnique({
      where: { id: params.id }
    });

    if (!existingStudy) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    // Check permissions
    const permissions = user.role.permissions as string[];
    const isOwner = existingStudy.principalInvestigatorId === user.userId;
    const canEditAll = permissions.includes('edit_all_studies');
    const canEditOwn = permissions.includes('edit_own_studies');

    if (!canEditAll && (!isOwner || !canEditOwn)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const study = await prisma.study.update({
      where: { id: params.id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        targetEnrollment: data.targetEnrollment,
        riskLevel: data.riskLevel,
      },
      include: {
        principalInvestigator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_STUDY',
        entity: 'Study',
        entityId: study.id,
        details: { changes: data }
      }
    });

    return NextResponse.json(study);
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);

    // Check permissions
    const permissions = user.role.permissions as string[];
    if (!permissions.includes('delete_studies')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.study.delete({
      where: { id: params.id }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_STUDY',
        entity: 'Study',
        entityId: params.id,
        details: {}
      }
    });

    return NextResponse.json({ message: 'Study deleted successfully' });
  } catch (error) {
    console.error('Error deleting study:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}