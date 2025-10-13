// API middleware utilities for authentication, authorization, and validation
import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './auth';
import { AuthenticationError, AuthorizationError } from './errors';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

// Extract and verify JWT token from request
export function authenticateRequest(request: NextRequest): TokenPayload {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new AuthenticationError();
  }

  try {
    return verifyToken(token);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

// Check if user has required permission(s)
export function checkPermission(user: TokenPayload, required: string | string[]): void {
  const permissions = user.role.permissions as string[];
  const requiredPerms = Array.isArray(required) ? required : [required];

  const hasPermission = requiredPerms.some(perm => permissions.includes(perm));

  if (!hasPermission) {
    throw new AuthorizationError();
  }
}

// Check if user is the owner of a resource
export function checkOwnership(
  user: TokenPayload,
  resourceOwnerId: string,
  allowedPermission?: string
): void {
  const permissions = user.role.permissions as string[];

  // Allow if user is owner or has special permission
  if (user.userId === resourceOwnerId) {
    return;
  }

  if (allowedPermission && permissions.includes(allowedPermission)) {
    return;
  }

  throw new AuthorizationError('You do not have permission to access this resource');
}

// Rate limiting tracker (in-memory for simplicity, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Parse pagination params from request
export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit
  };
}

// Parse sort params from request
export function getSortParams(request: NextRequest, defaultSort: any = { createdAt: 'desc' }) {
  const { searchParams } = new URL(request.url);

  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

  if (!sortBy) {
    return defaultSort;
  }

  return {
    [sortBy]: sortOrder
  };
}

// Parse filter params from request
export function getFilterParams(request: NextRequest, allowedFilters: string[]) {
  const { searchParams } = new URL(request.url);
  const filters: any = {};

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter);
    if (value) {
      filters[filter] = value;
    }
  }

  return filters;
}

// Search param parser
export function getSearchParam(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('search') || searchParams.get('q');
}

// CORS headers helper
export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // Configure properly in production
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
