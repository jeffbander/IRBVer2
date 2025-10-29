import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/middleware';
import { hasPermission } from '@/lib/permissions-helper';
import { rateLimiters } from '@/lib/rate-limit';
import { cors, handlePreflight } from '@/lib/cors';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

/**
 * POST /api/coordinators
 * Allows researchers, PIs, and admins to create new coordinator accounts
 *
 * This endpoint enables researchers and principal investigators to create coordinators.
 * The newly created coordinator will have the 'coordinator' role and can be assigned to studies.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await rateLimiters.write(request);
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);

    // Check if user is a researcher or admin
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { role: true },
    });

    if (!currentUser) {
      return cors(
        request,
        NextResponse.json({ error: 'User not found' }, { status: 404 })
      );
    }

    const permissions = currentUser.role.permissions;
    const isResearcher = currentUser.role.name === 'researcher';
    const isPI = currentUser.role.name === 'principal_investigator';
    const isAdmin = hasPermission(permissions, 'manage_users') || currentUser.role.name === 'admin';

    // Only researchers, PIs, and admins can create coordinators
    if (!isResearcher && !isPI && !isAdmin) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Only researchers, principal investigators, and admins can create coordinators' },
          { status: 403 }
        )
      );
    }

    const { email, password, firstName, lastName } = await request.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Email, password, firstName, and lastName are required' },
          { status: 400 }
        )
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      );
    }

    // Validate password strength (min 8 characters)
    if (password.length < 8) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        )
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return cors(
        request,
        NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      );
    }

    // Get coordinator role
    const coordinatorRole = await prisma.role.findUnique({
      where: { name: 'coordinator' },
    });

    if (!coordinatorRole) {
      return cors(
        request,
        NextResponse.json(
          { error: 'Coordinator role not found in system' },
          { status: 500 }
        )
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Log data being sent to Prisma for debugging
    console.log('Creating coordinator with data:', {
      email,
      firstName,
      lastName,
      roleId: coordinatorRole.id,
      active: true,
      approved: true,
    });

    // Create coordinator user
    let newCoordinator;
    try {
      newCoordinator = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          roleId: coordinatorRole.id,
          active: true,
          approved: true, // Auto-approve coordinators created by researchers
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          active: true,
          approved: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
        },
      });
    } catch (prismaError: any) {
      console.error('Prisma validation error details:', {
        message: prismaError.message,
        meta: prismaError.meta,
        code: prismaError.code,
      });
      throw prismaError;
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_COORDINATOR',
        entity: 'User',
        entityId: newCoordinator.id,
        metadata: {
          coordinatorEmail: newCoordinator.email,
          coordinatorName: `${newCoordinator.firstName} ${newCoordinator.lastName}`,
          createdBy: user.userId,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return cors(
      request,
      NextResponse.json(
        {
          id: newCoordinator.id,
          email: newCoordinator.email,
          firstName: newCoordinator.firstName,
          lastName: newCoordinator.lastName,
          role: newCoordinator.role,
          active: newCoordinator.active,
          approved: newCoordinator.approved,
          createdAt: newCoordinator.createdAt,
        },
        { status: 201 }
      )
    );
  } catch (error: any) {
    console.error('Error creating coordinator:', error);
    return cors(
      request,
      NextResponse.json(
        { error: 'Failed to create coordinator', details: error.message },
        { status: 500 }
      )
    );
  }
}
