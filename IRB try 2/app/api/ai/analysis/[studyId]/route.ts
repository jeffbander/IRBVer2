import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisResults } from '@/lib/ai/protocol-analyzer';

export const dynamic = 'force-dynamic';

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
