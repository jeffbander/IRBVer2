/**
 * POST /api/documents/[documentId]/ocr
 * Trigger OCR processing for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/middleware';
import {
  extractTextFromDocument,
  isOcrSupported,
  getSupportedFormatsText,
} from '@/lib/ocr';
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

    // Check if OCR is supported for this file type
    if (!isOcrSupported(document.mimeType)) {
      // Update document to mark as not supported
      await prisma.document.update({
        where: { id: params.documentId },
        data: {
          ocrStatus: 'not_supported',
          ocrError: `File type ${document.mimeType} is not supported for OCR. Supported formats: ${getSupportedFormatsText()}`,
          isOcrSupported: false,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'File type not supported for OCR',
          supportedFormats: getSupportedFormatsText(),
          fileType: document.mimeType,
        },
        { status: 400 }
      );
    }

    // Mark document as OCR processing
    await prisma.document.update({
      where: { id: params.documentId },
      data: {
        ocrStatus: 'processing',
        isOcrSupported: true,
        ocrError: null,
      },
    });

    console.log(`🔄 Starting OCR for document: ${document.name}`);

    // Perform OCR
    const filePath = path.join(process.cwd(), document.filePath);
    const ocrResult = await extractTextFromDocument(
      filePath,
      document.mimeType
    );

    if (ocrResult.success && ocrResult.content) {
      // Update document with OCR content
      const updatedDocument = await prisma.document.update({
        where: { id: params.documentId },
        data: {
          ocrContent: ocrResult.content,
          ocrStatus: 'completed',
          ocrModel: ocrResult.model,
          ocrProcessedAt: new Date(),
          ocrError: null,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'OCR_COMPLETED',
          entity: 'Document',
          entityId: params.documentId,
          details: {
            documentName: document.name,
            charactersExtracted: ocrResult.content.length,
            tokensUsed: ocrResult.tokensUsed,
            model: ocrResult.model,
            processingTimeMs: Date.now() - startTime,
          },
        },
      });

      console.log(
        `✅ OCR completed: ${ocrResult.content.length} characters extracted`
      );

      return NextResponse.json({
        success: true,
        message: 'OCR completed successfully',
        document: {
          id: updatedDocument.id,
          name: updatedDocument.name,
          ocrStatus: updatedDocument.ocrStatus,
          charactersExtracted: ocrResult.content.length,
          model: ocrResult.model,
        },
        content: ocrResult.content,
        processingTimeMs: Date.now() - startTime,
      });
    } else {
      // OCR failed
      await prisma.document.update({
        where: { id: params.documentId },
        data: {
          ocrStatus: 'failed',
          ocrError: ocrResult.error || 'Unknown error during OCR processing',
          ocrModel: ocrResult.model,
        },
      });

      // Create audit log for failure
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'OCR_FAILED',
          entity: 'Document',
          entityId: params.documentId,
          details: {
            documentName: document.name,
            error: ocrResult.error,
            model: ocrResult.model,
            processingTimeMs: Date.now() - startTime,
          },
        },
      });

      console.error(`❌ OCR failed: ${ocrResult.error}`);

      return NextResponse.json(
        {
          success: false,
          error: ocrResult.error || 'OCR processing failed',
          model: ocrResult.model,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error in OCR endpoint:', error);

    // Try to update document status
    try {
      await prisma.document.update({
        where: { id: params.documentId },
        data: {
          ocrStatus: 'failed',
          ocrError: error.message || 'Internal server error',
        },
      });
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

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

/**
 * GET /api/documents/[documentId]/ocr
 * Get OCR status and content for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Authenticate user
    authenticateRequest(request);

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        name: true,
        mimeType: true,
        ocrContent: true,
        ocrStatus: true,
        ocrError: true,
        ocrModel: true,
        ocrProcessedAt: true,
        isOcrSupported: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        mimeType: document.mimeType,
        ocrStatus: document.ocrStatus,
        ocrError: document.ocrError,
        ocrModel: document.ocrModel,
        ocrProcessedAt: document.ocrProcessedAt,
        isOcrSupported: document.isOcrSupported,
        hasOcrContent: !!document.ocrContent,
        contentLength: document.ocrContent?.length || 0,
      },
      content: document.ocrContent,
    });
  } catch (error: any) {
    console.error('❌ Error fetching OCR data:', error);

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
