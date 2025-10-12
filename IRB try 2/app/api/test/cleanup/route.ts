import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Cleanup not allowed in production' },
        { status: 403 }
      );
    }

    // Delete in reverse order of dependencies
    await prisma.automationLog.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.participant.deleteMany({});
    await prisma.study.deleteMany({});
    // Keep users and roles for authentication

    return NextResponse.json({
      success: true,
      message: 'Database cleaned successfully'
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: String(error) },
      { status: 500 }
    );
  }
}
