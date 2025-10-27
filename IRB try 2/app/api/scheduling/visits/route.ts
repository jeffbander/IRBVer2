import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware';

const prisma = new PrismaClient();

// GET /api/scheduling/visits - Get scheduled visits
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get('coordinatorId');
    const participantId = searchParams.get('participantId');
    const studyId = searchParams.get('studyId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (coordinatorId) {
      where.coordinatorId = coordinatorId;
    }

    if (participantId) {
      where.participantId = participantId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (studyId) {
      where.participant = {
        studyId,
      };
    }

    const visits = await prisma.participantVisit.findMany({
      where,
      include: {
        participant: {
          select: {
            id: true,
            participantId: true,
            firstName: true,
            lastName: true,
            study: {
              select: {
                id: true,
                title: true,
                protocolNumber: true,
              },
            },
          },
        },
        studyVisit: {
          select: {
            id: true,
            visitName: true,
            visitNumber: true,
            visitType: true,
          },
        },
        assignedCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        facilityBookings: {
          include: {
            facility: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return NextResponse.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}

// POST /api/scheduling/visits - Schedule a visit
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      participantId,
      studyVisitId,
      scheduledDate,
      coordinatorId,
      facilityId,
      schedulingMethod,
      notes,
    } = body;

    // Validate required fields
    if (!participantId || !studyVisitId || !scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for existing visit for this participant and study visit
    const existing = await prisma.participantVisit.findFirst({
      where: {
        participantId,
        studyVisitId,
        status: { in: ['scheduled', 'confirmed'] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Visit already scheduled for this participant' },
        { status: 409 }
      );
    }

    // Create the visit
    const visit = await prisma.participantVisit.create({
      data: {
        participantId,
        studyVisitId,
        scheduledDate: new Date(scheduledDate),
        coordinatorId: coordinatorId || null,
        schedulingMethod: schedulingMethod || 'manual',
        status: 'scheduled',
        notes: notes || null,
      },
      include: {
        participant: {
          select: {
            id: true,
            participantId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        studyVisit: {
          select: {
            id: true,
            visitName: true,
            visitNumber: true,
            visitType: true,
          },
        },
        assignedCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Book facility if provided
    if (facilityId) {
      const duration = 60; // Default 60 minutes
      const endTime = new Date(
        new Date(scheduledDate).getTime() + duration * 60000
      );

      await prisma.facilityBooking.create({
        data: {
          facilityId,
          participantVisit: visit.id,
          startTime: new Date(scheduledDate),
          endTime,
          purpose: `Visit: ${visit.studyVisit.visitName}`,
          bookedBy: authResult.user.id,
          status: 'booked',
        },
      });
    }

    // TODO: Send email/SMS notification to participant

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error('Error scheduling visit:', error);
    return NextResponse.json(
      { error: 'Failed to schedule visit' },
      { status: 500 }
    );
  }
}

// PATCH /api/scheduling/visits - Update visit (reschedule, cancel, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      scheduledDate,
      coordinatorId,
      status,
      notes,
      noShowReason,
      checkInTime,
      checkOutTime,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing visit ID' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
    }

    if (coordinatorId !== undefined) {
      updateData.coordinatorId = coordinatorId;
    }

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedDate = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (noShowReason !== undefined) {
      updateData.noShowReason = noShowReason;
    }

    if (checkInTime) {
      updateData.checkInTime = new Date(checkInTime);
    }

    if (checkOutTime) {
      updateData.checkOutTime = new Date(checkOutTime);

      // Calculate wait time if we have both check-in and scheduled time
      if (updateData.checkInTime || checkInTime) {
        const visit = await prisma.participantVisit.findUnique({
          where: { id },
        });
        if (visit) {
          const checkIn = updateData.checkInTime || new Date(checkInTime);
          const scheduled = visit.scheduledDate;
          const waitTimeMs = checkIn.getTime() - scheduled.getTime();
          updateData.waitTime = Math.floor(waitTimeMs / 60000); // Convert to minutes
        }
      }
    }

    const visit = await prisma.participantVisit.update({
      where: { id },
      data: updateData,
      include: {
        participant: {
          select: {
            id: true,
            participantId: true,
            firstName: true,
            lastName: true,
          },
        },
        studyVisit: {
          select: {
            id: true,
            visitName: true,
            visitNumber: true,
          },
        },
        assignedCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(visit);
  } catch (error) {
    console.error('Error updating visit:', error);
    return NextResponse.json(
      { error: 'Failed to update visit' },
      { status: 500 }
    );
  }
}
