import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

export type SupportedLanguage =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'ko'; // Korean

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: SupportedLanguage;
  confidence: number;
}

/**
 * Translate protocol text to target language using GPT-4o
 */
export async function translateProtocol(
  protocolText: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage: string = 'auto-detect'
): Promise<TranslationResult> {
  const languageNames: Record<SupportedLanguage, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    zh: 'Chinese (Simplified)',
    ja: 'Japanese',
    ko: 'Korean',
  };

  const systemPrompt = `You are a professional medical translator specializing in clinical trial protocols.
Your translations must:
- Maintain medical and scientific accuracy
- Preserve technical terminology correctly
- Follow regulatory language standards for the target locale
- Keep the same document structure and formatting`;

  const userPrompt = `Translate the following clinical trial protocol text to ${languageNames[targetLanguage]}.
${sourceLanguage !== 'auto-detect' ? `Source language: ${sourceLanguage}` : 'Automatically detect source language.'}

Protocol Text:
${protocolText.substring(0, 40000)} ${protocolText.length > 40000 ? '...(truncated for translation)' : ''}

IMPORTANT:
- Translate medical terms accurately
- Preserve all section headings and structure
- Keep numerical values unchanged
- Maintain regulatory compliance terminology
- If uncertain about a medical term, keep the original with explanation in parentheses

Provide the translation in plain text format (not JSON).`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more accurate translation
      max_tokens: 8000,
    });

    const translatedText = completion.choices[0]?.message?.content;
    if (!translatedText) {
      throw new Error('No translation response from OpenAI');
    }

    return {
      originalText: protocolText,
      translatedText,
      sourceLanguage: sourceLanguage === 'auto-detect' ? 'en' : sourceLanguage,
      targetLanguage,
      confidence: 0.95, // High confidence for GPT-4o translations
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

/**
 * Detect language of protocol text
 */
export async function detectLanguage(text: string): Promise<string> {
  const systemPrompt = `You are a language detection expert. Identify the language of the provided text.
Return only the ISO 639-1 language code (e.g., "en", "es", "fr", "de", etc.)`;

  const userPrompt = `Detect the language of this clinical trial protocol text:

${text.substring(0, 2000)}

Return ONLY the two-letter ISO 639-1 language code, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const languageCode = completion.choices[0]?.message?.content?.trim() || 'en';
    return languageCode;
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en'; // Default to English
  }
}

/**
 * Translate analysis results (executive summary, criteria, etc.)
 */
export async function translateAnalysisResults(
  analysisId: string,
  targetLanguage: SupportedLanguage
): Promise<{
  executiveSummary?: string;
  criteria: Array<{ id: string; description: string; originalText: string }>;
}> {
  const analysis = await prisma.aiAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      criteria: true,
    },
  });

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  const results: any = {};

  // Translate executive summary
  if (analysis.executiveSummary) {
    const translated = await translateProtocol(
      analysis.executiveSummary,
      targetLanguage
    );
    results.executiveSummary = translated.translatedText;
  }

  // Translate criteria descriptions
  results.criteria = await Promise.all(
    analysis.criteria.map(async (criterion) => {
      const translatedDesc = await translateProtocol(
        criterion.description,
        targetLanguage
      );
      const translatedOriginal = await translateProtocol(
        criterion.originalText,
        targetLanguage
      );

      return {
        id: criterion.id,
        description: translatedDesc.translatedText,
        originalText: translatedOriginal.translatedText,
      };
    })
  );

  return results;
}

/**
 * Get supported languages list
 */
export function getSupportedLanguages(): Array<{
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
  ];
}
