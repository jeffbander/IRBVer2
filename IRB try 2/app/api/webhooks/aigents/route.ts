import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractChainRunId, extractAgentResponse } from '@/lib/aigents';

/**
 * Webhook endpoint for receiving Aigents AI analysis results
 *
 * Aigents calls this endpoint when AI processing completes
 * We match the response to the document using the Chain Run ID
 */
export async function POST(request: NextRequest) {
  try {
    console.log('= Received Aigents webhook');

    // Parse the webhook payload
    const payload = await request.json();
    console.log('=æ Webhook payload:', JSON.stringify(payload, null, 2));

    // Extract Chain Run ID (used to match to the document)
    const chainRunId = extractChainRunId(payload);
    if (!chainRunId) {
      console.error('L No Chain Run ID found in webhook payload');
      return NextResponse.json(
        { error: 'Missing Chain Run ID' },
        { status: 400 }
      );
    }

    console.log('= Chain Run ID:', chainRunId);

    // Find the document that triggered this analysis
    const document = await prisma.document.findFirst({
      where: { aigentsRunId: chainRunId },
    });

    if (!document) {
      console.error('L No document found for Chain Run ID:', chainRunId);
      return NextResponse.json(
        { error: 'Document not found for this Chain Run ID' },
        { status: 404 }
      );
    }

    console.log('=Ä Found document:', document.id, document.name);

    // Extract the AI analysis response
    const agentResponse = extractAgentResponse(payload);
    if (!agentResponse) {
      console.error('L No agent response found in webhook payload');

      // Update document status to failed
      await prisma.document.update({
        where: { id: document.id },
        data: {
          aigentsStatus: 'failed',
          aigentsAnalysis: 'No response received from AI agent',
        },
      });

      return NextResponse.json(
        { error: 'Missing agent response' },
        { status: 400 }
      );
    }

    console.log('> Agent response length:', agentResponse.length, 'characters');

    // Update the document with the analysis results
    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        aigentsStatus: 'completed',
        aigentsAnalysis: agentResponse,
      },
    });

    console.log(' Document updated with AI analysis:', updatedDocument.id);
    console.log('=Ê Analysis preview:', agentResponse.substring(0, 200) + '...');

    // Return success response
    return NextResponse.json({
      success: true,
      documentId: document.id,
      chainRunId: chainRunId,
      analysisLength: agentResponse.length,
    });
  } catch (error) {
    console.error('L Error processing Aigents webhook:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
