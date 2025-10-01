import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET all studies (with filtering)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const piId = searchParams.get('piId');

    const where: any = {};

    // Filter based on user role
    if (user.role.name === 'researcher') {
      where.principalInvestigatorId = user.userId;
    } else if (user.role.name === 'reviewer') {
      where.OR = [
        { reviewerId: user.userId },
        { status: 'PENDING_REVIEW' }
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (piId) where.principalInvestigatorId = piId;

    const studies = await prisma.study.findMany({
      where,
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
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(studies);
  } catch (error) {
    console.error('Error fetching studies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new study
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const data = await request.json();

    // Check permissions
    const permissions = user.role.permissions as string[];
    if (!permissions.includes('create_studies')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_STUDY',
        entity: 'Study',
        entityId: study.id,
        details: { title: study.title, protocolNumber: study.protocolNumber }
      }
    });

    return NextResponse.json(study);
  } catch (error: any) {
    console.error('Error creating study:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Protocol number already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}