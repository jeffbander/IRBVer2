import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const permissions = user.role.permissions as string[];

    if (!permissions.includes('manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            name: true,
            permissions: true
          }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const currentUser = verifyToken(token);
    const permissions = currentUser.role.permissions as string[];

    if (!permissions.includes('manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { email, password, firstName, lastName, roleName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Get role
    const role = await prisma.role.findUnique({
      where: { name: roleName || 'researcher' }
    });

    if (!role) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId: role.id
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            name: true,
            permissions: true
          }
        },
        createdAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser.id,
        details: {
          newUserEmail: newUser.email,
          role: roleName
        }
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
