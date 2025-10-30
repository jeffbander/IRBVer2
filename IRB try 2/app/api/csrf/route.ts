import { NextRequest } from 'next/server';
import { createCsrfTokenResponse } from '@/lib/csrf';
import { handlePreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

/**
 * GET /api/csrf
 * Returns a CSRF token for the client to use in subsequent requests
 */
export async function GET(request: NextRequest) {
  return createCsrfTokenResponse();
}
