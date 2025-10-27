import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/middleware';

const prisma = new PrismaClient();

// GET /api/scheduling/analytics - Get scheduling analytics
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get('coordinatorId');
    const studyId = searchParams.get('studyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const where: any = {
      scheduledDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (coordinatorId) {
      where.coordinatorId = coordinatorId;
    }

    if (studyId) {
      where.participant = {
        studyId,
      };
    }

    // Get all visits in the date range
    const visits = await prisma.participantVisit.findMany({
      where,
      include: {
        participant: {
          select: {
            studyId: true,
          },
        },
      },
    });

    // Calculate metrics
    const totalVisits = visits.length;
    const scheduledVisits = visits.filter((v) => v.status === 'scheduled').length;
    const completedVisits = visits.filter((v) => v.status === 'completed').length;
    const cancelledVisits = visits.filter((v) => v.status === 'cancelled').length;
    const noShowVisits = visits.filter((v) => v.status === 'missed').length;

    // Calculate completion rate
    const completionRate = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;

    // Calculate average wait time
    const visitsWithWaitTime = visits.filter((v) => v.waitTime !== null);
    const avgWaitTime =
      visitsWithWaitTime.length > 0
        ? visitsWithWaitTime.reduce((sum, v) => sum + (v.waitTime || 0), 0) /
          visitsWithWaitTime.length
        : 0;

    // Calculate no-show rate
    const noShowRate = totalVisits > 0 ? (noShowVisits / totalVisits) * 100 : 0;

    // Coordinator utilization (if specific coordinator)
    let utilizationRate = null;
    if (coordinatorId) {
      // Get coordinator availability hours
      const availability = await prisma.coordinatorAvailability.findMany({
        where: { coordinatorId },
      });

      // Calculate total available hours per week
      const totalAvailableHoursPerWeek = availability.reduce((sum, avail) => {
        const [startHour, startMinute] = avail.startTime.split(':').map(Number);
        const [endHour, endMinute] = avail.endTime.split(':').map(Number);
        const hours = endHour - startHour + (endMinute - startMinute) / 60;
        return sum + hours;
      }, 0);

      // Calculate weeks in date range
      const weeks =
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24 * 7);

      const totalAvailableHours = totalAvailableHoursPerWeek * weeks;

      // Assume each visit takes 1 hour (could be improved with actual duration)
      const bookedHours = completedVisits + scheduledVisits;

      utilizationRate =
        totalAvailableHours > 0 ? (bookedHours / totalAvailableHours) * 100 : 0;
    }

    // Visits by day of week
    const visitsByDayOfWeek = Array(7).fill(0);
    visits.forEach((visit) => {
      const dayOfWeek = new Date(visit.scheduledDate).getDay();
      visitsByDayOfWeek[dayOfWeek]++;
    });

    // Visits by hour of day
    const visitsByHour = Array(24).fill(0);
    visits.forEach((visit) => {
      const hour = new Date(visit.scheduledDate).getHours();
      visitsByHour[hour]++;
    });

    // Trend data (visits per day)
    const dailyTrend: { [key: string]: number } = {};
    visits.forEach((visit) => {
      const dateKey = new Date(visit.scheduledDate).toISOString().split('T')[0];
      dailyTrend[dateKey] = (dailyTrend[dateKey] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalVisits,
        scheduledVisits,
        completedVisits,
        cancelledVisits,
        noShowVisits,
        completionRate: Math.round(completionRate * 10) / 10,
        noShowRate: Math.round(noShowRate * 10) / 10,
        avgWaitTime: Math.round(avgWaitTime * 10) / 10,
        utilizationRate:
          utilizationRate !== null
            ? Math.round(utilizationRate * 10) / 10
            : null,
      },
      distribution: {
        byDayOfWeek: visitsByDayOfWeek,
        byHour: visitsByHour,
      },
      trend: {
        daily: dailyTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
