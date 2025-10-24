import { prisma } from '@/lib/prisma';
import * as openaiClient from './openai-client';

export interface HistoricalInsight {
  metric: string;
  averageValue: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendation: string;
  dataPoints: number;
}

export interface HistoricalAnalysisResult {
  insights: HistoricalInsight[];
  comparisonToAverage: {
    metric: string;
    yourValue: number;
    average: number;
    percentile: number;
  }[];
  recommendations: string[];
}

/**
 * Analyze historical performance metrics for similar studies
 */
export async function analyzeHistoricalMetrics(
  studyId: string,
  phase?: string,
  therapeuticArea?: string
): Promise<HistoricalAnalysisResult> {
  // Get all historical metrics for similar studies
  const whereClause: any = {};

  if (phase) {
    whereClause.phase = phase;
  }

  if (therapeuticArea) {
    whereClause.therapeuticArea = therapeuticArea;
  }

  const metrics = await prisma.historicalMetric.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  // Group by metric type
  const metricsByType = metrics.reduce((acc, metric) => {
    if (!acc[metric.metricType]) {
      acc[metric.metricType] = [];
    }
    acc[metric.metricType].push(metric.metricValue);
    return acc;
  }, {} as Record<string, number[]>);

  // Calculate insights for each metric type
  const insights: HistoricalInsight[] = Object.entries(metricsByType).map(
    ([metricType, values]) => {
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const trend = calculateTrend(values);

      return {
        metric: metricType,
        averageValue: average,
        trend,
        recommendation: generateRecommendation(metricType, average, trend),
        dataPoints: values.length,
      };
    }
  );

  return {
    insights,
    comparisonToAverage: [],
    recommendations: insights.map((i) => i.recommendation),
  };
}

/**
 * Calculate trend from time series data
 */
function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
  if (values.length < 3) return 'stable';

  // Simple linear regression
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = numerator / denominator;

  // Threshold for determining trend
  const threshold = Math.abs(yMean * 0.1); // 10% change considered significant

  if (Math.abs(slope) < threshold) return 'stable';
  return slope > 0 ? 'improving' : 'declining';
}

/**
 * Generate recommendation based on metric and trend
 */
function generateRecommendation(
  metricType: string,
  average: number,
  trend: string
): string {
  const recommendations: Record<string, Record<string, string>> = {
    enrollment_rate: {
      improving: 'Enrollment rates are improving. Continue current recruitment strategies.',
      stable: 'Enrollment rates are stable. Consider targeted outreach to accelerate recruitment.',
      declining: 'Enrollment rates are declining. Review recruitment criteria and outreach methods.',
    },
    dropout_rate: {
      improving: 'Dropout rates are improving (decreasing). Maintain current participant engagement strategies.',
      stable: 'Dropout rates are stable. Monitor closely and address participant concerns proactively.',
      declining: 'Dropout rates are increasing. Implement stronger participant retention programs.',
    },
    completion_time: {
      improving: 'Study completion times are improving. Current processes are effective.',
      stable: 'Completion times are consistent. Look for opportunities to streamline processes.',
      declining: 'Completion times are increasing. Identify and address bottlenecks.',
    },
    budget_accuracy: {
      improving: 'Budget accuracy is improving. Continue refining cost estimation methods.',
      stable: 'Budget estimates are consistently accurate. Maintain current practices.',
      declining: 'Budget accuracy is declining. Review cost assumptions and add contingency buffers.',
    },
  };

  return (
    recommendations[metricType]?.[trend] ||
    `Average ${metricType}: ${average.toFixed(2)}. Trend: ${trend}.`
  );
}

/**
 * Store historical metrics for a completed study
 */
export async function storeHistoricalMetrics(
  studyId: string,
  metrics: {
    enrollmentRate?: number;
    dropoutRate?: number;
    completionTime?: number;
    budgetAccuracy?: number;
  },
  studyMetadata?: {
    phase?: string;
    therapeuticArea?: string;
  }
): Promise<void> {
  const timeframe = new Date().toISOString().slice(0, 7); // YYYY-MM format

  const metricsToStore = [
    {
      metricType: 'enrollment_rate',
      value: metrics.enrollmentRate,
    },
    {
      metricType: 'dropout_rate',
      value: metrics.dropoutRate,
    },
    {
      metricType: 'completion_time',
      value: metrics.completionTime,
    },
    {
      metricType: 'budget_accuracy',
      value: metrics.budgetAccuracy,
    },
  ].filter((m) => m.value !== undefined);

  await prisma.historicalMetric.createMany({
    data: metricsToStore.map((m) => ({
      studyId,
      metricType: m.metricType,
      metricValue: m.value!,
      timeframe,
      phase: studyMetadata?.phase,
      therapeuticArea: studyMetadata?.therapeuticArea,
    })),
  });

  console.log(`Stored ${metricsToStore.length} historical metrics for study ${studyId}`);
}

/**
 * Generate AI-powered best practices recommendations
 */
export async function generateBestPractices(
  studyMetadata: any,
  historicalInsights: HistoricalInsight[]
): Promise<string[]> {
  const systemPrompt = `You are a clinical research best practices expert.
Your task is to provide actionable recommendations based on historical study data and trends.`;

  const userPrompt = `Based on the following historical data and study information, provide 5 specific, actionable best practice recommendations:

Study Information:
${JSON.stringify(studyMetadata, null, 2)}

Historical Insights:
${historicalInsights.map((i) => `- ${i.metric}: Average ${i.averageValue.toFixed(2)}, Trend: ${i.trend}`).join('\n')}

Provide recommendations in JSON format:
{
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4",
    "Specific recommendation 5"
  ]
}`;

  try {
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    return result.recommendations || [];
  } catch (error) {
    console.error('Best practices generation error:', error);
    return historicalInsights.map((i) => i.recommendation);
  }
}
