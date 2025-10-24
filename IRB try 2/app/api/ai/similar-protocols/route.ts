import { NextRequest, NextResponse } from 'next/server';
import { findSimilarProtocols } from '@/lib/ai/embeddings';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const aiAnalysisId = searchParams.get('aiAnalysisId');
    const limit = parseInt(searchParams.get('limit') || '5');
    const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0.7');

    if (!aiAnalysisId) {
      return NextResponse.json(
        { error: 'Missing required parameter: aiAnalysisId' },
        { status: 400 }
      );
    }

    const similarProtocols = await findSimilarProtocols(
      aiAnalysisId,
      limit,
      minSimilarity
    );

    return NextResponse.json({
      success: true,
      count: similarProtocols.length,
      similarProtocols,
    });
  } catch (error) {
    console.error('Similar protocols API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
