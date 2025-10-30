import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/cookies';
import { cors, handlePreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    // Clear the auth cookie
    let response = NextResponse.json({
      message: 'Logout successful'
    });

    response = clearAuthCookie(response);
    return cors(request, response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
