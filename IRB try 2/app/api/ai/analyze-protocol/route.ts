import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { studyId, forceProvider } = await request.json();

    if (!studyId) {
      return NextResponse.json(
        { error: 'Study ID is required' },
        { status: 400 }
      );
    }

    // Validate forceProvider if provided
    if (forceProvider && !['openai', 'anthropic'].includes(forceProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "openai" or "anthropic"' },
        { status: 400 }
      );
    }

    // Dynamic import to avoid build-time errors
    const { analyzeProtocol } = await import('@/lib/ai/protocol-analyzer');

    // Run analysis
    const result = await analyzeProtocol({
      studyId,
      forceProvider,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Analysis failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysisId: result.analysisId,
      provider: result.provider,
      processingTimeMs: result.processingTimeMs,
    });
  } catch (error) {
    console.error('AI analysis API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
