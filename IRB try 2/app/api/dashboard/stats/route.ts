import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      verifyToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch statistics
    const [totalStudies, activeStudies, pendingReviews, totalParticipants] = await Promise.all([
      prisma.study.count(),
      prisma.study.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.study.count({
        where: { status: 'PENDING_REVIEW' },
      }),
      prisma.participant.count(),
    ]);

    return NextResponse.json({
      totalStudies,
      activeStudies,
      pendingReviews,
      totalParticipants,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}