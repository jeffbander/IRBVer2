import { NextRequest, NextResponse } from 'next/server';
import { translateProtocol, detectLanguage, SupportedLanguage } from '@/lib/ai/translation';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text, targetLanguage' },
        { status: 400 }
      );
    }

    // Validate target language
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'];
    if (!validLanguages.includes(targetLanguage)) {
      return NextResponse.json({ error: 'Invalid target language' }, { status: 400 });
    }

    const result = await translateProtocol(
      text,
      targetLanguage as SupportedLanguage,
      sourceLanguage
    );

    return NextResponse.json({
      success: true,
      translation: result,
    });
  } catch (error) {
    console.error('Translation API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get('text');

    if (!text) {
      return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
    }

    const language = await detectLanguage(text);

    return NextResponse.json({
      success: true,
      language,
    });
  } catch (error) {
    console.error('Language detection API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
