/**
 * Secure Cookie Management for JWT Tokens
 * Replaces localStorage with httpOnly cookies for XSS protection
 */
import { serialize, parse } from 'cookie';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN_NAME = 'irb_auth_token';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Set authentication token in httpOnly cookie
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  const cookie = serialize(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });

  response.headers.set('Set-Cookie', cookie);
  return response;
}

/**
 * Get authentication token from httpOnly cookie
 */
export function getAuthCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies[TOKEN_NAME] || null;
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  const cookie = serialize(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  response.headers.set('Set-Cookie', cookie);
  return response;
}

/**
 * Set a generic secure cookie
 */
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: CookieOptions = {}
): NextResponse {
  const cookie = serialize(name, value, {
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options.sameSite ?? 'strict',
    maxAge: options.maxAge ?? MAX_AGE,
    path: options.path ?? '/',
  });

  response.headers.append('Set-Cookie', cookie);
  return response;
}

/**
 * Get a cookie value
 */
export function getCookie(request: NextRequest, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies[name] || null;
}
