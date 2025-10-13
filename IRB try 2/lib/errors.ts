// Centralized error handling for the application
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

// Error response helper
export function errorResponse(error: unknown, defaultMessage: string = 'Internal server error') {
  console.error('Error occurred:', error);

  // Handle AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.details ? { details: error.details } : {})
      },
      { status: error.statusCode }
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Handle JWT errors
  if (error instanceof Error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { error: 'Invalid token', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    if (error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { error: 'Token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }
  }

  // Default error response
  return NextResponse.json(
    {
      error: defaultMessage,
      code: 'INTERNAL_SERVER_ERROR'
    },
    { status: 500 }
  );
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return NextResponse.json(
        {
          error: `A record with this ${field} already exists`,
          code: 'DUPLICATE_ENTRY'
        },
        { status: 409 }
      );

    case 'P2025':
      // Record not found
      return NextResponse.json(
        { error: 'Record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );

    case 'P2003':
      // Foreign key constraint violation
      return NextResponse.json(
        {
          error: 'Cannot perform operation due to related records',
          code: 'FOREIGN_KEY_VIOLATION'
        },
        { status: 409 }
      );

    case 'P2014':
      // Required relation violation
      return NextResponse.json(
        {
          error: 'The change violates a required relation',
          code: 'RELATION_VIOLATION'
        },
        { status: 400 }
      );

    default:
      return NextResponse.json(
        { error: 'Database error occurred', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
  }
}

// Async error handler wrapper
export function asyncHandler(
  fn: Function
) {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

// Validation helper
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);

  if (missing.length > 0) {
    throw new ValidationError(
      'Missing required fields',
      { missingFields: missing }
    );
  }
}

// Permission checker helper
export function requirePermission(userPermissions: string[], required: string | string[]): void {
  const requiredPerms = Array.isArray(required) ? required : [required];
  const hasPermission = requiredPerms.some(perm => userPermissions.includes(perm));

  if (!hasPermission) {
    throw new AuthorizationError();
  }
}
