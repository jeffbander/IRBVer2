import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimiters } from '@/lib/rate-limit';
import { cors, handlePreflight } from '@/lib/cors';
import { setAuthCookie, clearAuthCookie } from '@/lib/cookies';
import { setCsrfCookie, generateCsrfToken } from '@/lib/csrf';

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function POST(request: NextRequest) {
  // Apply rate limiting to auth endpoints
  const rateLimited = await rateLimiters.auth(request);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'login') {
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      }

      const result = await authenticateUser(email, password);

      if (!result) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Set httpOnly cookie with JWT token and CSRF token
      const csrfToken = generateCsrfToken();
      let response = NextResponse.json({
        user: result.user,
        token: result.token, // BACKWARD COMPATIBILITY: For API tests and programmatic access
        csrfToken, // Client needs this to send in headers
        message: 'Login successful'
      });
      response = setAuthCookie(response, result.token);
      response = setCsrfCookie(response, csrfToken);
      return cors(request, response);
    } catch (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  if (action === 'register') {
    try {
      const { email, password, firstName, lastName, roleName } = await request.json();

      if (!email || !password || !firstName || !lastName) {
        return NextResponse.json(
          { error: 'All fields are required' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 400 }
        );
      }

      // Get or create role
      let role = await prisma.role.findUnique({
        where: { name: roleName || 'researcher' },
      });

      if (!role) {
        // Create default roles if they don't exist
        role = await prisma.role.create({
          data: {
            name: roleName || 'researcher',
            description: 'Default researcher role',
            permissions: JSON.stringify([
              'view_studies',
              'create_studies',
              'edit_own_studies',
              'manage_participants',
              'upload_documents',
            ]),
          },
        });
      }

      const user = await createUser({
        email,
        password,
        firstName,
        lastName,
        roleId: role.id,
      });

      const result = await authenticateUser(email, password);

      // Set httpOnly cookie with JWT token and CSRF token
      const csrfToken = generateCsrfToken();
      let response = NextResponse.json({
        user: result.user,
        token: result.token, // BACKWARD COMPATIBILITY: For API tests and programmatic access
        csrfToken, // Client needs this to send in headers
        message: 'Registration successful'
      });
      response = setAuthCookie(response, result.token);
      response = setCsrfCookie(response, csrfToken);
      return cors(request, response);
    } catch (error) {
      console.error('Registration error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}