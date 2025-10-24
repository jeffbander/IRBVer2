import * as openaiClient from './openai-client';
import * as anthropicClient from './anthropic-client';
import { prisma } from '@/lib/prisma';
import {
  generateProtocolEmbedding,
  updateAnalysisWithEmbedding,
  storeSimilarityRelationships,
} from './embeddings';
import {
  analyzeHistoricalMetrics,
  generateBestPractices,
} from './historical-analysis';

export interface AnalyzeProtocolOptions {
  studyId: string;
  forceProvider?: 'openai' | 'anthropic';
}

export interface AnalysisResult {
  success: boolean;
  analysisId?: string;
  error?: string;
  provider: 'openai' | 'anthropic';
  processingTimeMs: number;
}

/**
 * Main function to analyze a clinical trial protocol
 * Orchestrates the entire analysis pipeline
 */
export async function analyzeProtocol(
  options: AnalyzeProtocolOptions
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const { studyId, forceProvider } = options;

  try {
    // 1. Get study and protocol document
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        documents: {
          where: {
            type: 'PROTOCOL',
            isLatestVersion: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!study) {
      throw new Error('Study not found');
    }

    const protocolDoc = study.documents[0];
    if (!protocolDoc) {
      throw new Error('No protocol document found for this study');
    }

    if (!protocolDoc.ocrContent) {
      throw new Error('Protocol has not been OCR processed yet');
    }

    // 2. Create AI Analysis record with pending status
    const aiAnalysis = await prisma.aiAnalysis.create({
      data: {
        studyId,
        status: 'processing',
        model: forceProvider || 'gpt-4o',
      },
    });

    try {
      // 3. Determine which AI provider to use
      const useOpenAI = forceProvider === 'openai' || (!forceProvider && process.env.OPENAI_API_KEY);
      const provider = useOpenAI ? 'openai' : 'anthropic';

      // 4. Run protocol analysis
      console.log(`Analyzing protocol for study ${studyId} using ${provider}...`);

      const analysisResult = useOpenAI
        ? await openaiClient.analyzeProtocol({
            protocolText: protocolDoc.ocrContent,
            documentName: protocolDoc.name,
            studyTitle: study.title,
          })
        : await anthropicClient.analyzeProtocol({
            protocolText: protocolDoc.ocrContent,
            documentName: protocolDoc.name,
            studyTitle: study.title,
          });

      const data = analysisResult.data;

      // 5. Update AI Analysis record with results
      const processingTimeMs = Date.now() - startTime;

      await prisma.aiAnalysis.update({
        where: { id: aiAnalysis.id },
        data: {
          status: 'completed',
          model: analysisResult.model,
          studyMetadata: JSON.stringify(data.studyMetadata || {}),
          executiveSummary: data.executiveSummary,
          complexityScore: data.complexityScore,
          complianceScore: data.complianceScore,
          riskLevel: data.riskLevel,
          processingTimeMs,
        },
      });

      console.log(`Protocol analysis completed in ${processingTimeMs}ms`);

      // 6. Extract and store criteria (parallel task)
      extractAndStoreCriteria(aiAnalysis.id, protocolDoc.ocrContent, provider).catch(
        (err) => console.error('Criteria extraction error:', err)
      );

      // 7. Generate and store visit schedule (parallel task)
      generateAndStoreVisitSchedule(aiAnalysis.id, protocolDoc.ocrContent, provider).catch(
        (err) => console.error('Visit schedule generation error:', err)
      );

      // 8. Generate budget estimate (Phase 2 - parallel task)
      generateAndStoreBudgetEstimate(
        aiAnalysis.id,
        protocolDoc.ocrContent,
        provider,
        study.targetEnrollment || undefined
      ).catch((err) => console.error('Budget estimation error:', err));

      // 9. Perform risk assessment (Phase 2 - parallel task)
      performAndStoreRiskAssessment(
        aiAnalysis.id,
        protocolDoc.ocrContent,
        provider,
        data.studyMetadata
      ).catch((err) => console.error('Risk assessment error:', err));

      // 10. Check compliance (Phase 2 - parallel task)
      performAndStoreComplianceCheck(
        aiAnalysis.id,
        protocolDoc.ocrContent,
        provider,
        data.studyMetadata
      ).catch((err) => console.error('Compliance check error:', err));

      // 11. Generate embeddings and find similar protocols (Phase 3 - parallel task)
      generateAndStoreEmbeddings(
        aiAnalysis.id,
        study.title,
        data.executiveSummary,
        data.studyMetadata
      ).catch((err) => console.error('Embedding generation error:', err));

      // 12. Analyze historical data and generate best practices (Phase 3 - parallel task)
      analyzeHistoricalData(
        study.id,
        data.studyMetadata
      ).catch((err) => console.error('Historical analysis error:', err));

      return {
        success: true,
        analysisId: aiAnalysis.id,
        provider,
        processingTimeMs,
      };
    } catch (analysisError) {
      // Update analysis record with error
      await prisma.aiAnalysis.update({
        where: { id: aiAnalysis.id },
        data: {
          status: 'failed',
          errorMessage: analysisError instanceof Error ? analysisError.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
        },
      });

      throw analysisError;
    }
  } catch (error) {
    console.error('Protocol analysis error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: forceProvider || 'openai',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract inclusion/exclusion criteria and store in database
 */
async function extractAndStoreCriteria(
  aiAnalysisId: string,
  protocolText: string,
  provider: 'openai' | 'anthropic'
): Promise<void> {
  try {
    console.log(`Extracting criteria using ${provider}...`);

    const result =
      provider === 'openai'
        ? await openaiClient.extractCriteria({
            protocolText,
            criteriaType: 'both',
          })
        : await anthropicClient.extractCriteria({
            protocolText,
            criteriaType: 'both',
          });

    const criteria = result.data;

    // Store criteria in database
    if (criteria && criteria.length > 0) {
      await prisma.criterion.createMany({
        data: criteria.map((c: any) => ({
          aiAnalysisId,
          type: c.type,
          category: c.category,
          description: c.description,
          originalText: c.originalText,
          logicOperator: c.logicOperator,
          priority: c.priority || 5,
          confidence: c.confidence,
        })),
      });

      console.log(`Stored ${criteria.length} criteria`);
    }
  } catch (error) {
    console.error('Criteria extraction failed:', error);
    // Don't throw - this is a non-critical failure
  }
}

/**
 * Generate visit schedule and store in database
 */
async function generateAndStoreVisitSchedule(
  aiAnalysisId: string,
  protocolText: string,
  provider: 'openai' | 'anthropic'
): Promise<void> {
  try {
    console.log(`Generating visit schedule using ${provider}...`);

    const result =
      provider === 'openai'
        ? await openaiClient.generateVisitSchedule({ protocolText })
        : await anthropicClient.generateVisitSchedule({ protocolText });

    const data = result.data;
    const visits = data.visits || [];

    // Store visit schedule in database
    if (visits.length > 0) {
      await prisma.visitSchedule.createMany({
        data: visits.map((v: any) => ({
          aiAnalysisId,
          visitName: v.visitName,
          visitNumber: v.visitNumber,
          dayRange: v.dayRange,
          procedures: JSON.stringify(v.procedures || []),
          duration: v.duration,
          notes: v.notes,
        })),
      });

      console.log(`Stored ${visits.length} visits`);
    }
  } catch (error) {
    console.error('Visit schedule generation failed:', error);
    // Don't throw - this is a non-critical failure
  }
}

/**
 * Get analysis results for a study
 */
export async function getAnalysisResults(studyId: string) {
  const analysis = await prisma.aiAnalysis.findUnique({
    where: { studyId },
    include: {
      criteria: {
        orderBy: [{ type: 'asc' }, { priority: 'desc' }],
      },
      visitSchedule: {
        orderBy: { visitNumber: 'asc' },
      },
      budgetEstimate: true,
      complianceChecks: {
        orderBy: { severity: 'desc' },
      },
      similarities: {
        include: {
          similarStudy: {
            select: {
              id: true,
              title: true,
              protocolNumber: true,
              type: true,
              status: true,
              targetEnrollment: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { similarityScore: 'desc' },
      },
      userFeedback: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!analysis) {
    return null;
  }

  // Parse JSON fields
  return {
    ...analysis,
    studyMetadata: analysis.studyMetadata ? JSON.parse(analysis.studyMetadata) : null,
    visitSchedule: analysis.visitSchedule.map((v) => ({
      ...v,
      procedures: JSON.parse(v.procedures),
    })),
    similarities: analysis.similarities.map((s) => ({
      ...s,
      matchingAspects: JSON.parse(s.matchingAspects),
    })),
  };
}

/**
 * Submit user feedback on AI analysis
 */
export async function submitFeedback(data: {
  aiAnalysisId: string;
  userId: string;
  feedbackType: string;
  rating: number;
  comment?: string;
  correctedData?: any;
}) {
  return await prisma.userFeedback.create({
    data: {
      aiAnalysisId: data.aiAnalysisId,
      userId: data.userId,
      feedbackType: data.feedbackType,
      rating: data.rating,
      comment: data.comment,
      correctedData: data.correctedData ? JSON.stringify(data.correctedData) : null,
    },
  });
}

/**
 * Phase 2: Generate and store budget estimate
 */
async function generateAndStoreBudgetEstimate(
  aiAnalysisId: string,
  protocolText: string,
  provider: 'openai' | 'anthropic',
  targetEnrollment?: number
): Promise<void> {
  try {
    console.log(`Generating budget estimate using ${provider}...`);

    // Get visit schedule for more accurate estimation
    const visitSchedule = await prisma.visitSchedule.findMany({
      where: { aiAnalysisId },
    });

    const result =
      provider === 'openai'
        ? await openaiClient.estimateBudget({
            protocolText,
            visitSchedule: visitSchedule.map((v) => ({
              visitName: v.visitName,
              procedures: JSON.parse(v.procedures),
            })),
            targetEnrollment,
          })
        : null; // Anthropic version can be added later

    if (!result || !result.data) return;

    const data = result.data;

    // Store budget estimate in database
    await prisma.budgetEstimate.create({
      data: {
        aiAnalysisId,
        totalEstimate: data.totalEstimate,
        perParticipantCost: data.perParticipantCost,
        breakdown: JSON.stringify(data.breakdown || {}),
        assumptions: data.assumptions,
      },
    });

    console.log(`Budget estimate stored: $${data.totalEstimate.toLocaleString()}`);
  } catch (error) {
    console.error('Budget estimation failed:', error);
  }
}

/**
 * Phase 2: Perform and store risk assessment
 */
async function performAndStoreRiskAssessment(
  aiAnalysisId: string,
  protocolText: string,
  provider: 'openai' | 'anthropic',
  studyMetadata?: any
): Promise<void> {
  try {
    console.log(`Performing risk assessment using ${provider}...`);

    const result =
      provider === 'openai'
        ? await openaiClient.assessRisk({
            protocolText,
            studyMetadata,
          })
        : null;

    if (!result || !result.data) return;

    const data = result.data;

    // Update AI Analysis with overall risk level and score
    await prisma.aiAnalysis.update({
      where: { id: aiAnalysisId },
      data: {
        riskLevel: data.overallRiskLevel,
      },
    });

    // Store individual safety risks (we'll use a simplified approach for now)
    // In a full implementation, you'd create a separate SafetyRisk model
    console.log(`Risk assessment completed: ${data.overallRiskLevel} risk, score ${data.riskScore}`);
  } catch (error) {
    console.error('Risk assessment failed:', error);
  }
}

/**
 * Phase 2: Perform and store compliance check
 */
async function performAndStoreComplianceCheck(
  aiAnalysisId: string,
  protocolText: string,
  provider: 'openai' | 'anthropic',
  studyMetadata?: any
): Promise<void> {
  try {
    console.log(`Performing compliance check using ${provider}...`);

    const result =
      provider === 'openai'
        ? await openaiClient.checkCompliance({
            protocolText,
            studyMetadata,
          })
        : null;

    if (!result || !result.data) return;

    const data = result.data;

    // Update AI Analysis with compliance score
    await prisma.aiAnalysis.update({
      where: { id: aiAnalysisId },
      data: {
        complianceScore: data.complianceScore,
      },
    });

    // Store compliance checks
    if (data.complianceChecks && data.complianceChecks.length > 0) {
      await prisma.complianceCheck.createMany({
        data: data.complianceChecks.map((check: any) => ({
          aiAnalysisId,
          regulation: check.regulation,
          status: check.status,
          finding: check.finding,
          recommendation: check.recommendation,
          severity: check.severity,
        })),
      });

      console.log(`Stored ${data.complianceChecks.length} compliance checks`);
    }
  } catch (error) {
    console.error('Compliance check failed:', error);
  }
}

/**
 * Phase 3: Generate and store embeddings for similarity search
 */
async function generateAndStoreEmbeddings(
  aiAnalysisId: string,
  studyTitle: string,
  executiveSummary: string,
  studyMetadata: any
): Promise<void> {
  try {
    console.log('Generating protocol embedding...');

    const embedding = await generateProtocolEmbedding({
      studyTitle,
      executiveSummary,
      studyMetadata,
      therapeuticArea: studyMetadata?.therapeuticArea,
      phase: studyMetadata?.phase,
    });

    // Store embedding
    await updateAnalysisWithEmbedding(aiAnalysisId, embedding);

    console.log('Embedding generated and stored');

    // Find and store similar protocols
    await storeSimilarityRelationships(aiAnalysisId);
  } catch (error) {
    console.error('Embedding generation failed:', error);
  }
}

/**
 * Phase 3: Analyze historical data and generate best practices
 */
async function analyzeHistoricalData(
  studyId: string,
  studyMetadata: any
): Promise<void> {
  try {
    console.log('Analyzing historical data...');

    const historicalAnalysis = await analyzeHistoricalMetrics(
      studyId,
      studyMetadata?.phase,
      studyMetadata?.therapeuticArea
    );

    console.log(`Found ${historicalAnalysis.insights.length} historical insights`);

    // Generate AI-powered best practices
    if (historicalAnalysis.insights.length > 0) {
      const bestPractices = await generateBestPractices(
        studyMetadata,
        historicalAnalysis.insights
      );

      console.log(`Generated ${bestPractices.length} best practice recommendations`);
    }
  } catch (error) {
    console.error('Historical analysis failed:', error);
  }
}
