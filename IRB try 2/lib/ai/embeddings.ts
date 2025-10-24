import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

export interface ProtocolEmbeddingInput {
  studyTitle: string;
  executiveSummary: string;
  studyMetadata: any;
  therapeuticArea?: string;
  phase?: string;
}

/**
 * Generate embedding vector for a protocol using OpenAI text-embedding-3-large
 * This creates a 1536-dimensional vector representation of the protocol
 */
export async function generateProtocolEmbedding(
  input: ProtocolEmbeddingInput
): Promise<number[]> {
  // Create a comprehensive text representation of the protocol
  const protocolText = `
Study Title: ${input.studyTitle}

Executive Summary: ${input.executiveSummary}

${input.therapeuticArea ? `Therapeutic Area: ${input.therapeuticArea}` : ''}
${input.phase ? `Study Phase: ${input.phase}` : ''}

Study Metadata:
${JSON.stringify(input.studyMetadata, null, 2)}
  `.trim();

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: protocolText,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a score between 0 and 1, where 1 is most similar
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar protocols based on embedding similarity
 */
export async function findSimilarProtocols(
  aiAnalysisId: string,
  limit: number = 5,
  minSimilarity: number = 0.7
): Promise<Array<{ studyId: string; similarity: number; study: any }>> {
  // Get the source analysis with its embedding
  const sourceAnalysis = await prisma.aiAnalysis.findUnique({
    where: { id: aiAnalysisId },
    include: {
      study: {
        select: {
          id: true,
          title: true,
          protocolNumber: true,
        },
      },
    },
  });

  if (!sourceAnalysis || !sourceAnalysis.embedding) {
    throw new Error('Source analysis not found or has no embedding');
  }

  const sourceEmbedding = JSON.parse(sourceAnalysis.embedding);

  // Get all other analyses with embeddings
  const allAnalyses = await prisma.aiAnalysis.findMany({
    where: {
      id: { not: aiAnalysisId },
      embedding: { not: null },
    },
    include: {
      study: {
        select: {
          id: true,
          title: true,
          protocolNumber: true,
          type: true,
          status: true,
          riskLevel: true,
          targetEnrollment: true,
        },
      },
    },
  });

  // Calculate similarities
  const similarities = allAnalyses
    .map((analysis) => {
      const embedding = JSON.parse(analysis.embedding!);
      const similarity = cosineSimilarity(sourceEmbedding, embedding);

      return {
        studyId: analysis.studyId,
        similarity,
        study: analysis.study,
        analysis: {
          complexityScore: analysis.complexityScore,
          complianceScore: analysis.complianceScore,
          riskLevel: analysis.riskLevel,
        },
      };
    })
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}

/**
 * Store protocol similarity relationships in database
 */
export async function storeSimilarityRelationships(
  aiAnalysisId: string
): Promise<void> {
  try {
    const similarProtocols = await findSimilarProtocols(aiAnalysisId, 10, 0.6);

    if (similarProtocols.length === 0) {
      console.log('No similar protocols found');
      return;
    }

    // Delete existing similarities for this analysis
    await prisma.protocolSimilarity.deleteMany({
      where: { aiAnalysisId },
    });

    // Store new similarities
    await prisma.protocolSimilarity.createMany({
      data: similarProtocols.map((similar) => ({
        aiAnalysisId,
        similarStudyId: similar.studyId,
        similarityScore: similar.similarity,
        matchingAspects: JSON.stringify({
          title: similar.study.title,
          type: similar.study.type,
          riskLevel: similar.study.riskLevel,
          complexityScore: similar.analysis.complexityScore,
        }),
      })),
    });

    console.log(`Stored ${similarProtocols.length} similar protocols`);
  } catch (error) {
    console.error('Error storing similarity relationships:', error);
    // Don't throw - this is a non-critical failure
  }
}

/**
 * Update AI analysis with embedding
 */
export async function updateAnalysisWithEmbedding(
  aiAnalysisId: string,
  embedding: number[]
): Promise<void> {
  await prisma.aiAnalysis.update({
    where: { id: aiAnalysisId },
    data: {
      embedding: JSON.stringify(embedding),
      embeddingModel: 'text-embedding-3-large',
      embeddingCreated: new Date(),
    },
  });
}
