import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware';

const prisma = new PrismaClient();

// GET /api/scheduling/time-off - Get time off requests
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get('coordinatorId');
    const status = searchParams.get('status');

    const where: any = {};

    if (coordinatorId) {
      where.coordinatorId = coordinatorId;
    }

    if (status) {
      where.status = status;
    }

    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where,
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
      orderBy: {
        startDate: 'asc',
      },
    });

    return NextResponse.json(timeOffRequests);
  } catch (error) {
    console.error('Error fetching time off requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time off requests' },
      { status: 500 }
    );
  }
}

// POST /api/scheduling/time-off - Create time off request
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      coordinatorId,
      startDate,
      endDate,
      requestType,
      reason,
    } = body;

    // Validate required fields
    if (!coordinatorId || !startDate || !endDate || !requestType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        coordinatorId,
        startDate: start,
        endDate: end,
        requestType,
        reason: reason || null,
        status: 'pending',
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

    return NextResponse.json(timeOffRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating time off request:', error);
    return NextResponse.json(
      { error: 'Failed to create time off request' },
      { status: 500 }
    );
  }
}

// PATCH /api/scheduling/time-off - Update time off request (approve/deny)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, approverId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['pending', 'approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be pending, approved, or denied' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
    };

    if (status !== 'pending') {
      updateData.approvedBy = approverId || authResult.user.id;
      updateData.approvedAt = new Date();
    }

    const timeOffRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(timeOffRequest);
  } catch (error) {
    console.error('Error updating time off request:', error);
    return NextResponse.json(
      { error: 'Failed to update time off request' },
      { status: 500 }
    );
  }
}
