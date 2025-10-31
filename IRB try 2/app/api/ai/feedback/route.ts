import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback } from '@/lib/ai/protocol-analyzer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { aiAnalysisId, userId, feedbackType, rating, comment, correctedData } =
      await request.json();

    // Validation
    if (!aiAnalysisId || !userId || !feedbackType || !rating) {
      return NextResponse.json(
        {
          error: 'Missing required fields: aiAnalysisId, userId, feedbackType, rating',
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const validFeedbackTypes = ['accuracy', 'completeness', 'usefulness'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    const feedback = await submitFeedback({
      aiAnalysisId,
      userId,
      feedbackType,
      rating,
      comment,
      correctedData,
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('Submit feedback API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
