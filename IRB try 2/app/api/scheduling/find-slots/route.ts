import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware';

const prisma = new PrismaClient();

interface TimeSlot {
  start: Date;
  end: Date;
  coordinatorId: string;
  coordinatorName: string;
  facilityId?: string;
  facilityName?: string;
  score: number;
  availability: 'available' | 'limited' | 'busy';
}

// GET /api/scheduling/find-slots - Find available time slots for visit scheduling
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studyVisitId = searchParams.get('studyVisitId');
    const participantId = searchParams.get('participantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const duration = parseInt(searchParams.get('duration') || '60'); // minutes

    if (!studyVisitId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get study visit details
    const studyVisit = await prisma.studyVisit.findUnique({
      where: { id: studyVisitId },
      include: { study: true },
    });

    if (!studyVisit) {
      return NextResponse.json(
        { error: 'Study visit not found' },
        { status: 404 }
      );
    }

    // Get available coordinators for this study
    const studyCoordinators = await prisma.studyCoordinator.findMany({
      where: {
        studyId: studyVisit.studyId,
        active: true,
      },
      include: {
        coordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (studyCoordinators.length === 0) {
      return NextResponse.json(
        { error: 'No coordinators assigned to this study' },
        { status: 404 }
      );
    }

    const coordinatorIds = studyCoordinators.map((sc) => sc.coordinatorId);

    // Get coordinator availability
    const availability = await prisma.coordinatorAvailability.findMany({
      where: {
        coordinatorId: { in: coordinatorIds },
        effectiveFrom: { lte: new Date(endDate) },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(startDate) } },
        ],
      },
    });

    // Get coordinator time off
    const timeOff = await prisma.timeOffRequest.findMany({
      where: {
        coordinatorId: { in: coordinatorIds },
        status: 'approved',
        startDate: { lte: new Date(endDate) },
        endDate: { gte: new Date(startDate) },
      },
    });

    // Get existing visits for coordinators
    const existingVisits = await prisma.participantVisit.findMany({
      where: {
        coordinatorId: { in: coordinatorIds },
        scheduledDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: { in: ['scheduled', 'confirmed'] },
      },
    });

    // Get active facilities
    const facilities = await prisma.facility.findMany({
      where: { active: true },
    });

    // Generate time slots
    const slots = generateTimeSlots({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      duration,
      coordinators: studyCoordinators.map((sc) => ({
        id: sc.coordinatorId,
        name: `${sc.coordinator.firstName} ${sc.coordinator.lastName}`,
      })),
      availability,
      timeOff,
      existingVisits,
      facilities,
    });

    // Score and sort slots
    const scoredSlots = slots
      .map((slot) => ({
        ...slot,
        score: calculateSlotScore(slot, existingVisits),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Return top 20 slots

    return NextResponse.json({
      slots: scoredSlots,
      totalSlotsFound: slots.length,
    });
  } catch (error) {
    console.error('Error finding slots:', error);
    return NextResponse.json(
      { error: 'Failed to find available slots' },
      { status: 500 }
    );
  }
}

function generateTimeSlots(params: {
  startDate: Date;
  endDate: Date;
  duration: number;
  coordinators: Array<{ id: string; name: string }>;
  availability: any[];
  timeOff: any[];
  existingVisits: any[];
  facilities: any[];
}): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const {
    startDate,
    endDate,
    duration,
    coordinators,
    availability,
    timeOff,
    existingVisits,
    facilities,
  } = params;

  // Iterate through each day in the date range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // For each coordinator
    for (const coordinator of coordinators) {
      // Check if coordinator is available on this day
      const dayAvailability = availability.filter(
        (a) => a.coordinatorId === coordinator.id && a.dayOfWeek === dayOfWeek
      );

      for (const avail of dayAvailability) {
        // Check if coordinator is on time off
        const isTimeOff = timeOff.some(
          (to) =>
            to.coordinatorId === coordinator.id &&
            currentDate >= new Date(to.startDate) &&
            currentDate <= new Date(to.endDate)
        );

        if (isTimeOff) continue;

        // Generate time slots within availability window
        const [startHour, startMinute] = avail.startTime.split(':').map(Number);
        const [endHour, endMinute] = avail.endTime.split(':').map(Number);

        let slotStart = new Date(currentDate);
        slotStart.setHours(startHour, startMinute, 0, 0);

        const windowEnd = new Date(currentDate);
        windowEnd.setHours(endHour, endMinute, 0, 0);

        while (slotStart.getTime() + duration * 60000 <= windowEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          // Check for conflicts with existing visits
          const hasConflict = existingVisits.some((visit) => {
            if (visit.coordinatorId !== coordinator.id) return false;
            const visitStart = new Date(visit.scheduledDate);
            const visitEnd = new Date(
              visitStart.getTime() + (visit.duration || 60) * 60000
            );
            return slotStart < visitEnd && slotEnd > visitStart;
          });

          if (!hasConflict) {
            slots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
              coordinatorId: coordinator.id,
              coordinatorName: coordinator.name,
              score: 0,
              availability: 'available',
            });
          }

          // Move to next slot (30-minute intervals)
          slotStart = new Date(slotStart.getTime() + 30 * 60000);
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

function calculateSlotScore(slot: TimeSlot, existingVisits: any[]): number {
  let score = 100;

  // Prefer morning slots (9 AM - 12 PM)
  const hour = slot.start.getHours();
  if (hour >= 9 && hour < 12) {
    score += 20;
  } else if (hour >= 12 && hour < 14) {
    score += 10;
  } else if (hour >= 14 && hour < 17) {
    score += 5;
  }

  // Prefer weekdays over weekends
  const dayOfWeek = slot.start.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    score += 15;
  }

  // Penalize if coordinator is heavily booked that day
  const coordinatorVisitsToday = existingVisits.filter((visit) => {
    if (visit.coordinatorId !== slot.coordinatorId) return false;
    const visitDate = new Date(visit.scheduledDate);
    return visitDate.toDateString() === slot.start.toDateString();
  });

  score -= coordinatorVisitsToday.length * 5;

  // Prefer earlier dates
  const daysFromNow = Math.floor(
    (slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysFromNow < 7) {
    score += 10;
  }

  return Math.max(0, score);
}
