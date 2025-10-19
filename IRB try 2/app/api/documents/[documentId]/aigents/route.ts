/**
 * POST /api/documents/[documentId]/aigents
 * Trigger Aigents AI analysis for a document (Bidirectional Webhook Pattern)
 *
 * FLOW:
 * 1. User clicks "Analyze with AI"
 * 2. This endpoint triggers Aigents chain
 * 3. Get Chain Run ID from response
 * 4. Create AutomationLog with Chain Run ID
 * 5. Return immediately (don't wait)
 * 6. UI polls for completion
 * 7. Webhook receiver (/api/webhooks/aigents) updates when done
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/middleware';
import { logRequest } from '@/lib/logger';
import {
  triggerAigentsChain,
  getChainNameForDocumentType,
} from '@/lib/aigents';
import { createAutomationLog } from '@/lib/automation-logs';
import fs from 'fs/promises';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const user = authenticateRequest(request);

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: params.documentId },
      include: {
        study: true,
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Determine which chain to run based on document type
    const chainName = getChainNameForDocumentType(document.type);
    console.log(`📋 Document type: ${document.type} → Chain: ${chainName}`);

    // Use OCR content if available, otherwise try to read file
    let documentContent: string | undefined;

    if (document.ocrContent) {
      // PREFERRED: Use OCR extracted content
      documentContent = document.ocrContent;
      console.log(`📄 Using OCR content (${documentContent.length} characters)`);
    } else if (document.ocrStatus === 'processing') {
      // OCR is still processing
      return NextResponse.json(
        {
          success: false,
          error: 'Document OCR is still processing. Please wait for OCR to complete before triggering AI analysis.',
          ocrStatus: document.ocrStatus,
        },
        { status: 400 }
      );
    } else if (document.ocrStatus === 'failed') {
      // OCR failed, warn but continue
      console.warn(`⚠️  OCR failed for document, attempting to read raw file: ${document.ocrError}`);
    }

    // Fallback: Try to read document content directly if no OCR
    if (!documentContent) {
      try {
        if (document.filePath.includes('/uploads/mock') || document.filePath.startsWith('/uploads/')) {
          // For mock/test documents, use placeholder content
          documentContent = `Mock ${document.type} Document - ${document.name}\n\nThis is a test document for demonstration purposes.\n\nStudy: ${document.study.title}\nDocument Type: ${document.type}`;
        } else {
          // Check if filePath is already absolute
          const filePath = path.isAbsolute(document.filePath)
            ? document.filePath
            : path.join(process.cwd(), document.filePath);
          const fileBuffer = await fs.readFile(filePath);
          if (document.mimeType.includes('text') || document.mimeType.includes('json')) {
            documentContent = fileBuffer.toString('utf-8');
          }
        }
      } catch (error) {
        console.error('Error reading document file:', error);
        documentContent = `Document: ${document.name}\n\nDocument Type: ${document.type}\n\nStudy: ${document.study.title}\n\nThis document is being analyzed for IRB compliance.`;
      }
    }

    if (!documentContent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to extract document content. For PDF/image files, please ensure OCR processing has completed.',
          suggestion: 'Try manually triggering OCR first via the OCR button, or ensure the document contains text.',
        },
        { status: 400 }
      );
    }

    // Trigger Aigents chain using new webhook pattern
    console.log(`🚀 Triggering Aigents chain: ${chainName}`);
    const aigentsResponse = await triggerAigentsChain({
      chainToRun: chainName,
      documentId: params.documentId,
      studyId: document.studyId,
      documentName: document.name,
      documentType: document.type,
      documentContent,
      firstStepInput: `Analyze this ${document.type} document: ${document.name}\n\nStudy: ${document.study.title}\n\n${documentContent?.substring(0, 1000) || ''}`,
    });

    if (!aigentsResponse.success) {
      console.error('❌ Failed to trigger Aigents:', aigentsResponse.error);

      // Update document with error status
      await prisma.document.update({
        where: { id: params.documentId },
        data: {
          aigentsStatus: 'failed',
          aigentsError: aigentsResponse.error,
          aigentstartedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to trigger Aigents analysis',
          details: aigentsResponse.error,
        },
        { status: 500 }
      );
    }

    const { chainRunId } = aigentsResponse;
    console.log(`✅ Chain started with Run ID: ${chainRunId}`);

    // Create AutomationLog to track this request
    const automationLog = await createAutomationLog({
      chainName,
      chainRunId,
      documentId: params.documentId,
      studyId: document.studyId,
      requestedBy: user.userId,
      requestData: {
        documentName: document.name,
        documentType: document.type,
        studyTitle: document.study.title,
        chainName,
      },
    });

    console.log(`📝 AutomationLog created: ${automationLog.id}`);

    // Update document with processing status
    await prisma.document.update({
      where: { id: params.documentId },
      data: {
        aigentsChainName: chainName,
        aigentsRunId: chainRunId,
        aigentsStatus: 'processing',
        aigentstartedAt: new Date(),
        aigentsError: null, // Clear any previous errors
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'AIGENTS_ANALYSIS_TRIGGERED',
        entity: 'Document',
        entityId: params.documentId,
        metadata: {
          chainName,
          chainRunId,
          documentName: document.name,
          documentType: document.type,
          automationLogId: automationLog.id,
        },
      },
    });

    logRequest(request, { userId: user.userId, startTime });

    // Return immediately - webhook will update when complete
    return NextResponse.json({
      success: true,
      chainRunId,
      chainName,
      status: 'processing',
      automationLogId: automationLog.id,
      message: 'AI analysis started. Results will appear when processing completes (15-25 seconds).',
      expectedCompletionTime: '15-25 seconds',
    });
  } catch (error: any) {
    console.error('❌ Error in Aigents trigger endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
