/**
 * Aigents Webhook Receiver (Bidirectional Pattern)
 * Receives webhook callbacks from Aigents when chain runs complete
 *
 * FLOW:
 * 1. Document uploaded → Trigger sent with Chain Run ID
 * 2. Aigents processes (15-25 seconds)
 * 3. Aigents sends webhook HERE with Chain Run ID
 * 4. We match Chain Run ID → AutomationLog → Update Document
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateAutomationLogByChainRunId,
  getAutomationLogByChainRunId,
} from '@/lib/automation-logs';
import {
  extractChainRunId,
  extractAgentResponse,
} from '@/lib/aigents';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  console.log('\n🎣 Webhook received from Aigents');
  const startTime = Date.now();

  try {
    // Parse webhook payload
    const webhookPayload = await request.json();
    console.log('📦 Webhook payload keys:', Object.keys(webhookPayload));

    // Extract Chain Run ID (THE KEY to linking request → response)
    const chainRunId = extractChainRunId(webhookPayload);

    if (!chainRunId) {
      console.error('❌ No Chain Run ID found in webhook payload');
      console.log('Payload:', JSON.stringify(webhookPayload, null, 2).substring(0, 500));

      return NextResponse.json(
        {
          error: 'No Chain Run ID found in webhook',
          message: 'Cannot process webhook without Chain Run ID',
          receivedFields: Object.keys(webhookPayload),
        },
        { status: 400 }
      );
    }

    console.log('🔗 Chain Run ID:', chainRunId);

    // Find the automation log for this chain run
    const automationLog = await getAutomationLogByChainRunId(chainRunId);

    if (!automationLog) {
      console.error(`❌ No automation log found for Chain Run ID: ${chainRunId}`);

      return NextResponse.json(
        {
          error: 'Automation log not found',
          chainRunId,
          message: `No pending automation found for Chain Run ID: ${chainRunId}`,
        },
        { status: 404 }
      );
    }

    console.log('✅ Found automation log:', {
      id: automationLog.id,
      chainName: automationLog.chainName,
      documentId: automationLog.documentId,
      studyId: automationLog.studyId,
    });

    // Extract agent response from webhook
    const agentResponse = extractAgentResponse(webhookPayload);
    const responsePreview = agentResponse.substring(0, 150) + (agentResponse.length > 150 ? '...' : '');
    console.log('📄 Agent response extracted:', responsePreview);

    // Determine status from webhook
    const webhookStatus = webhookPayload.status?.toLowerCase() || 'completed';
    const status = webhookStatus === 'failed' ? 'failed' : 'completed';
    const errorMessage =
      status === 'failed' ? webhookPayload.error || 'Chain run failed' : undefined;

    // Update automation log with response
    const updatedLog = await updateAutomationLogByChainRunId(chainRunId, {
      webhookPayload,
      agentResponse,
      status,
      errorMessage,
      isCompleted: true,
    });

    console.log('✅ Automation log updated:', {
      id: updatedLog?.id,
      status: updatedLog?.status,
      isCompleted: updatedLog?.isCompleted,
    });

    // Also update the Document with AI analysis (if linked)
    if (automationLog.documentId) {
      await prisma.document.update({
        where: { id: automationLog.documentId },
        data: {
          aigentsStatus: status,
          aigentsAnalysis: agentResponse,
          aigentsCompletedAt: new Date(),
          aigentsError: errorMessage,
          aigentsRunId: chainRunId, // Store for backward compatibility
        },
      });

      console.log('✅ Document updated with AI analysis');
    }

    // Create audit log
    if (automationLog.requestedBy) {
      await prisma.auditLog.create({
        data: {
          userId: automationLog.requestedBy,
          action: 'AIGENTS_WEBHOOK_RECEIVED',
          entity: 'AutomationLog',
          entityId: automationLog.id,
          details: {
            chainRunId,
            chainName: automationLog.chainName,
            status,
            documentId: automationLog.documentId,
            responseLength: agentResponse.length,
            processingTime: Date.now() - startTime,
          },
        },
      });
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed successfully in ${processingTime}ms\n`);

    // Return success to Aigents
    return NextResponse.json({
      message: 'Webhook processed successfully',
      chainRunId,
      automationLogId: automationLog.id,
      documentId: automationLog.documentId,
      status: 'success',
      processingTimeMs: processingTime,
    });
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing/health check
 */
export async function GET(request: NextRequest) {
  // Get some stats about pending automations
  const pending = await prisma.automationLog.count({
    where: {
      isCompleted: false,
      status: 'processing',
    },
  });

  const total = await prisma.automationLog.count();
  const completed = await prisma.automationLog.count({
    where: { isCompleted: true },
  });

  return NextResponse.json({
    message: 'Aigents webhook endpoint is active',
    endpoint: '/api/webhooks/aigents',
    methods: ['POST', 'GET'],
    instructions: [
      '1. Configure this URL in your Aigents chain webhook settings',
      '2. Ensure webhook includes "Chain Run ID" field',
      '3. Include agent response in fields like: agentResponse, summ, Final_Output, etc.',
    ],
    stats: {
      totalAutomations: total,
      completed,
      pending,
    },
    timestamp: new Date().toISOString(),
  });
}
