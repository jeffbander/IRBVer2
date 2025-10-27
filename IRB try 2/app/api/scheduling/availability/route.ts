import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware';

const prisma = new PrismaClient();

// GET /api/scheduling/availability - Get coordinator availability
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get('coordinatorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (coordinatorId) {
      where.coordinatorId = coordinatorId;
    }

    if (startDate) {
      where.effectiveFrom = {
        lte: new Date(startDate),
      };
      where.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date(startDate) } },
      ];
    }

    const availability = await prisma.coordinatorAvailability.findMany({
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
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

// POST /api/scheduling/availability - Set coordinator availability
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      coordinatorId,
      dayOfWeek,
      startTime,
      endTime,
      effectiveFrom,
      effectiveTo,
      isRecurring,
      timezone,
    } = body;

    // Validate required fields
    if (!coordinatorId || dayOfWeek === undefined || !startTime || !endTime || !effectiveFrom) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate day of week (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Invalid dayOfWeek. Must be 0-6 (Sunday-Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      );
    }

    const availability = await prisma.coordinatorAvailability.create({
      data: {
        coordinatorId,
        dayOfWeek,
        startTime,
        endTime,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isRecurring: isRecurring ?? true,
        timezone: timezone || 'America/New_York',
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

    return NextResponse.json(availability, { status: 201 });
  } catch (error) {
    console.error('Error creating availability:', error);
    return NextResponse.json(
      { error: 'Failed to create availability' },
      { status: 500 }
    );
  }
}

// DELETE /api/scheduling/availability?id=xxx - Delete availability
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing availability ID' },
        { status: 400 }
      );
    }

    await prisma.coordinatorAvailability.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Availability deleted successfully' });
  } catch (error) {
    console.error('Error deleting availability:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability' },
      { status: 500 }
    );
  }
}
