import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health check endpoint
 * Returns application status and connectivity checks
 */
export async function GET() {
  try {
    // Check database connectivity
    const dbCheck = await checkDatabase();

    // System info
    const health = {
      status: dbCheck ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      checks: {
        database: dbCheck ? 'connected' : 'disconnected',
      },
    };

    const statusCode = dbCheck ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<boolean> {
  try {
    // Simple query to check database connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database check failed:', error);
    return false;
  }
}
