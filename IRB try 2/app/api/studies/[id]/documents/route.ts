import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { DocumentType } from '@prisma/client';
import { extractTextFromDocument, isOcrSupported } from '@/lib/ocr';

// GET - List documents for a study
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    verifyToken(token);

    const documents = await prisma.document.findMany({
      where: { studyId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Upload a new document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);

    // Verify study exists
    const study = await prisma.study.findUnique({
      where: { id: params.id }
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Check if it's JSON (for testing/API) or FormData (for file upload)
    if (contentType.includes('application/json')) {
      // Handle JSON request (no actual file, just metadata)
      const body = await request.json();
      const { title, documentType, version = 1, filePath: mockFilePath, fileSize = 1024 } = body;

      if (!title || !documentType) {
        return NextResponse.json({ error: 'Title and documentType are required' }, { status: 400 });
      }

      // Create document record without actual file
      const document = await prisma.document.create({
        data: {
          studyId: params.id,
          name: title,
          type: documentType as DocumentType,
          description: null,
          version,
          filePath: mockFilePath || `/uploads/mock/${Date.now()}-document.pdf`,
          fileSize: fileSize,
          mimeType: 'application/pdf',
          uploadedById: user.userId,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'UPLOAD_DOCUMENT',
          entity: 'Document',
          entityId: document.id,
          metadata: {
            studyId: params.id,
            documentName: title,
            documentType: documentType,
            fileSize: fileSize,
            method: 'json'
          }
        }
      });

      return NextResponse.json(document, { status: 201 });
    }

    // Handle FormData request (actual file upload)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    const versionString = formData.get('version') as string;
    const version = versionString ? parseInt(versionString, 10) : 1;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'studies', params.id);
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedFileName}`;
    const filePath = path.join(uploadsDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Check for existing documents with same name to handle versioning
    const existingDocuments = await prisma.document.findMany({
      where: {
        studyId: params.id,
        name,
        isLatestVersion: true,
      },
      orderBy: { version: 'desc' },
      take: 1,
    });

    const nextVersion = existingDocuments.length > 0 ? existingDocuments[0].version + 1 : 1;

    // If there's an existing latest version, mark it as not latest
    if (existingDocuments.length > 0) {
      await prisma.document.update({
        where: { id: existingDocuments[0].id },
        data: { isLatestVersion: false },
      });
    }

    // Check if OCR is supported
    const ocrSupported = isOcrSupported(file.type);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        studyId: params.id,
        name,
        type: type as DocumentType,
        description: description || null,
        version: nextVersion,
        filePath: path.join(process.cwd(), 'uploads', 'studies', params.id, filename),
        fileSize: file.size,
        mimeType: file.type,
        uploadedById: user.userId,
        isOcrSupported: ocrSupported,
        ocrStatus: ocrSupported ? 'pending' : 'not_supported',
        parentDocumentId: existingDocuments.length > 0 ? existingDocuments[0].id : null,
        isLatestVersion: true,
        versionNotes: existingDocuments.length > 0 ? `Version ${nextVersion} - Updated document` : null,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log(`📄 Document uploaded: ${name} (v${nextVersion}) - OCR supported: ${ocrSupported}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPLOAD_DOCUMENT',
        entity: 'Document',
        entityId: document.id,
        metadata: {
          studyId: params.id,
          documentName: name,
          documentType: type,
          fileSize: file.size,
          version: nextVersion,
          ocrSupported,
        }
      }
    });

    // Automatically trigger OCR processing if supported (async, don't wait)
    if (ocrSupported) {
      console.log(`🔄 Triggering automatic OCR for document: ${document.id}`);

      // Run OCR in background (non-blocking)
      setImmediate(async () => {
        try {
          await prisma.document.update({
            where: { id: document.id },
            data: { ocrStatus: 'processing' },
          });

          const ocrResult = await extractTextFromDocument(filePath, file.type);

          if (ocrResult.success && ocrResult.content) {
            await prisma.document.update({
              where: { id: document.id },
              data: {
                ocrContent: ocrResult.content,
                ocrStatus: 'completed',
                ocrModel: ocrResult.model,
                ocrProcessedAt: new Date(),
                ocrError: null,
              },
            });

            await prisma.auditLog.create({
              data: {
                userId: user.userId,
                action: 'OCR_COMPLETED',
                entity: 'Document',
                entityId: document.id,
                metadata: {
                  charactersExtracted: ocrResult.content.length,
                  model: ocrResult.model,
                  tokensUsed: ocrResult.tokensUsed,
                },
              },
            });

            console.log(`✅ Auto-OCR completed for ${document.id}: ${ocrResult.content.length} chars`);
          } else {
            await prisma.document.update({
              where: { id: document.id },
              data: {
                ocrStatus: 'failed',
                ocrError: ocrResult.error || 'OCR processing failed',
                ocrModel: ocrResult.model,
              },
            });
            console.error(`❌ Auto-OCR failed for ${document.id}: ${ocrResult.error}`);
          }
        } catch (error: any) {
          console.error(`❌ Auto-OCR error for ${document.id}:`, error);
          await prisma.document.update({
            where: { id: document.id },
            data: {
              ocrStatus: 'failed',
              ocrError: error.message || 'OCR processing error',
            },
          }).catch(console.error);
        }
      });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
