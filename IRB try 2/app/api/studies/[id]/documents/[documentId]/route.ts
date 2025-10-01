import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { readFile, unlink } from 'fs/promises';
import path from 'path';

// GET - Download a document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    verifyToken(token);

    const document = await prisma.document.findUnique({
      where: { id: params.documentId }
    });

    if (!document || document.studyId !== params.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), 'uploads', 'studies', params.id, document.fileName);
    const fileBuffer = await readFile(filePath);

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'Content-Length': document.fileSize.toString()
      }
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const permissions = user.role.permissions as string[];

    if (!permissions.includes('manage_documents')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const document = await prisma.document.findUnique({
      where: { id: params.documentId }
    });

    if (!document || document.studyId !== params.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', 'studies', params.id, document.fileName);
    try {
      await unlink(filePath);
    } catch (err) {
      console.warn('File not found on disk:', filePath);
    }

    // Delete document record
    await prisma.document.delete({
      where: { id: params.documentId }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_DOCUMENT',
        entity: 'Document',
        entityId: document.id,
        details: {
          studyId: params.id,
          documentName: document.name,
          documentType: document.type
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = verifyToken(token);
    const permissions = user.role.permissions as string[];

    if (!permissions.includes('manage_documents')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { name, description, version } = await request.json();

    const document = await prisma.document.findUnique({
      where: { id: params.documentId }
    });

    if (!document || document.studyId !== params.id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: params.documentId },
      data: {
        name: name || document.name,
        description: description !== undefined ? description : document.description,
        version: version || document.version
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
        action: 'UPDATE_DOCUMENT',
        entity: 'Document',
        entityId: document.id,
        details: {
          studyId: params.id,
          changes: { name, description, version }
        }
      }
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
