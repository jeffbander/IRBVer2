/**
 * CSRF Protection
 * Implements double-submit cookie pattern for CSRF protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { serialize, parse } from 'cookie';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Set CSRF token cookie in response
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  const cookie = serialize(CSRF_TOKEN_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript to send in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_COOKIE_MAX_AGE,
    path: '/',
  });

  response.headers.append('Set-Cookie', cookie);
  return response;
}

/**
 * Get CSRF token from cookie
 */
export function getCsrfToken(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies[CSRF_TOKEN_NAME] || null;
}

/**
 * Get CSRF token from request header
 */
export function getCsrfHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME) || null;
}

/**
 * Validate CSRF token using double-submit cookie pattern
 * Compares token from cookie with token from header
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfToken(request);
  const headerToken = getCsrfHeader(request);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

/**
 * Middleware to validate CSRF token for state-changing operations
 * Should be used for POST, PUT, PATCH, DELETE requests
 */
export function requireCsrfToken(request: NextRequest): void {
  const method = request.method;

  // Only validate CSRF for state-changing operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }

  // Skip CSRF validation for certain paths (like login)
  const url = new URL(request.url);
  const skipPaths = [
    '/api/auth?action=login',
    '/api/auth?action=register',
    '/api/auth/logout',
  ];

  if (skipPaths.some(path => url.pathname + url.search === path)) {
    return;
  }

  if (!validateCsrfToken(request)) {
    throw new Error('Invalid or missing CSRF token');
  }
}

/**
 * Generate CSRF token endpoint response
 * Call this from a GET endpoint to provide token to client
 */
export function createCsrfTokenResponse(): NextResponse {
  const token = generateCsrfToken();

  let response = NextResponse.json({
    csrfToken: token,
  });

  response = setCsrfCookie(response, token);
  return response;
}

/**
 * Refresh CSRF token and set in cookie
 */
export function refreshCsrfToken(response: NextResponse): NextResponse {
  const token = generateCsrfToken();
  return setCsrfCookie(response, token);
}
