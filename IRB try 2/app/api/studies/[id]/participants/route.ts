import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { validateForm, participantValidationSchema } from '@/lib/validation';

// GET participants for a study
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

    const participants = await prisma.participant.findMany({
      where: { studyId: params.id },
      orderBy: { enrollmentDate: 'desc' }
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Enroll new participant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const permissions = user.role.permissions as string[];

    if (!permissions.includes('manage_participants')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data = await request.json();

    // Validate input data
    const validation = validateForm(data, participantValidationSchema);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    const { subjectId, consentDate, enrollmentDate, status, groupAssignment } = data;

    // Verify study exists and is active
    const study = await prisma.study.findUnique({
      where: { id: params.id }
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    if (study.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Only active studies can enroll participants' }, { status: 400 });
    }

    // Check if subject ID already exists in this study
    const existing = await prisma.participant.findFirst({
      where: {
        studyId: params.id,
        subjectId: subjectId
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Subject ID already exists in this study' }, { status: 400 });
    }

    // Create participant
    const participant = await prisma.participant.create({
      data: {
        studyId: params.id,
        participantId: `${params.id}-${subjectId}`, // Generate unique participantId
        subjectId,
        consentDate: consentDate ? new Date(consentDate) : null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : null,
        status,
        groupAssignment: groupAssignment || null,
      }
    });

    // Update study enrollment count
    await prisma.study.update({
      where: { id: params.id },
      data: {
        currentEnrollment: {
          increment: 1
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'ENROLL_PARTICIPANT',
        entity: 'Participant',
        entityId: participant.id,
        details: {
          studyId: params.id,
          subjectId: participant.subjectId
        }
      }
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error('Error enrolling participant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}