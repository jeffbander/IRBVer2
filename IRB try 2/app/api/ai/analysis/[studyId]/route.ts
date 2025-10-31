import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { studyId: string } }
) {
  try {
    const { studyId } = params;

    if (!studyId) {
      return NextResponse.json(
        { error: 'Study ID is required' },
        { status: 400 }
      );
    }

    // Dynamic import to avoid build-time errors
    const { getAnalysisResults } = await import('@/lib/ai/protocol-analyzer');
    const analysis = await getAnalysisResults(studyId);

    if (!analysis) {
      return NextResponse.json(
        { error: 'No analysis found for this study' },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Get analysis API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
