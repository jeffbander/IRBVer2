import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalysisPromptOptions {
  protocolText: string;
  documentName: string;
  studyTitle?: string;
}

export interface CriteriaExtractionOptions {
  protocolText: string;
  criteriaType: 'inclusion' | 'exclusion' | 'both';
}

export interface VisitScheduleOptions {
  protocolText: string;
}

/**
 * Analyze a clinical trial protocol using Claude 3.5 Sonnet
 * This is a fallback when OpenAI is unavailable
 */
export async function analyzeProtocol(options: AnalysisPromptOptions) {
  const { protocolText, documentName, studyTitle } = options;

  const prompt = `You are an expert clinical research analyst specializing in FDA-regulated clinical trials.
Your task is to analyze clinical trial protocols and extract structured information with high accuracy.
You must follow ICH-GCP E6(R2) guidelines and FDA 21 CFR Part 11 requirements.

Analyze the following clinical trial protocol and extract key information.

Document: ${documentName}
${studyTitle ? `Study Title: ${studyTitle}` : ''}

Protocol Text:
${protocolText.substring(0, 100000)} ${protocolText.length > 100000 ? '...(truncated for analysis)' : ''}

Please provide a comprehensive analysis in the following JSON format:
{
  "studyMetadata": {
    "title": "extracted study title",
    "phase": "Phase I/II/III/IV",
    "sponsor": "sponsor name",
    "principalInvestigator": "PI name",
    "targetEnrollment": number,
    "studyDuration": "duration description",
    "therapeuticArea": "disease/condition being studied"
  },
  "executiveSummary": "A concise 3-5 sentence summary of the protocol highlighting key objectives, population, intervention, and primary outcomes",
  "complexityScore": number (1-10, where 1=simple single-arm study, 10=complex multi-arm adaptive design),
  "complexityFactors": ["list of factors contributing to complexity"],
  "complianceScore": number (0-100, percentage indicating protocol compliance with regulations),
  "complianceIssues": ["list of potential compliance concerns if any"],
  "riskLevel": "low|medium|high|critical",
  "riskFactors": ["list of identified risk factors"],
  "keyFindings": ["list of 3-5 key findings from the protocol"]
}

Return ONLY the JSON object, no additional text.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const result = JSON.parse(jsonText);

    return {
      success: true,
      data: result,
      model: 'claude-3.5-sonnet',
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Anthropic analysis error:', error);
    throw error;
  }
}

/**
 * Extract inclusion/exclusion criteria from protocol text
 */
export async function extractCriteria(options: CriteriaExtractionOptions) {
  const { protocolText, criteriaType } = options;

  const criteriaSection = criteriaType === 'both'
    ? 'both inclusion AND exclusion criteria'
    : `${criteriaType} criteria`;

  const prompt = `You are a clinical research data extraction specialist.
Your task is to extract and structure inclusion/exclusion criteria from clinical trial protocols with 90%+ accuracy.
Each criterion should be atomic (one concept per criterion) and clearly categorized.

Extract ${criteriaSection} from the following protocol text.

Protocol Text:
${protocolText.substring(0, 100000)} ${protocolText.length > 100000 ? '...(truncated)' : ''}

Return a JSON array of criteria objects with the following structure:
{
  "criteria": [
    {
      "type": "inclusion|exclusion",
      "category": "age|medical_history|medication|laboratory|diagnostic|pregnancy|consent|other",
      "description": "clear, concise criterion description",
      "originalText": "exact text from protocol",
      "logicOperator": "AND|OR|NOT (if applicable)",
      "priority": number (1-10, higher = more critical),
      "confidence": number (0.0-1.0, your confidence in extraction accuracy)
    }
  ]
}

Guidelines:
- Extract EVERY criterion mentioned in the protocol
- Break compound criteria into atomic criteria
- Preserve exact wording in originalText
- Assign logical categories
- Identify logic operators (AND/OR/NOT) for compound criteria
- Priority 1-3 = Nice to have, 4-7 = Important, 8-10 = Critical
- Be conservative with confidence scores

Return ONLY the JSON object, no additional text.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 6000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const result = JSON.parse(jsonText);

    return {
      success: true,
      data: result.criteria || [],
      model: 'claude-3.5-sonnet',
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Anthropic criteria extraction error:', error);
    throw error;
  }
}

/**
 * Generate visit schedule from protocol text
 */
export async function generateVisitSchedule(options: VisitScheduleOptions) {
  const { protocolText } = options;

  const prompt = `You are a clinical trial operations specialist.
Your task is to extract and structure the study visit schedule from clinical trial protocols.
Focus on identifying all study visits, procedures, and their timing.

Extract the complete visit schedule from the following protocol text.

Protocol Text:
${protocolText.substring(0, 100000)} ${protocolText.length > 100000 ? '...(truncated)' : ''}

Return a JSON object with the following structure:
{
  "visits": [
    {
      "visitNumber": number (sequential order),
      "visitName": "Screening|Baseline|Week 4|Month 3|Final Visit|etc.",
      "dayRange": "Day 0|Week 1|Month 3|Day 7±2|etc.",
      "procedures": ["procedure 1", "procedure 2", "..."],
      "duration": "expected visit duration if mentioned",
      "notes": "any special instructions or requirements"
    }
  ],
  "totalDuration": "overall study duration",
  "followUpPeriod": "follow-up duration if applicable"
}

Guidelines:
- Extract ALL visits mentioned in the protocol
- Include all procedures/assessments for each visit
- Preserve timing windows accurately (e.g., ±2 days)
- Order visits chronologically
- Include screening, treatment, and follow-up visits

Return ONLY the JSON object, no additional text.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const result = JSON.parse(jsonText);

    return {
      success: true,
      data: result,
      model: 'claude-3.5-sonnet',
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Anthropic visit schedule generation error:', error);
    throw error;
  }
}

export default anthropic;
