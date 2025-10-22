import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractChainRunId, extractAgentResponse } from '@/lib/aigents';

export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK] Received Aigents webhook');
    const payload = await request.json();
    const chainRunId = extractChainRunId(payload);

    if (!chainRunId) {
      return NextResponse.json({ error: 'Missing Chain Run ID' }, { status: 400 });
    }

    const document = await prisma.document.findFirst({
      where: { aigentsRunId: chainRunId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const agentResponse = extractAgentResponse(payload);

    if (!agentResponse) {
      await prisma.document.update({
        where: { id: document.id },
        data: { aigentsStatus: 'failed', aigentsAnalysis: 'No response' },
      });
      return NextResponse.json({ error: 'Missing response' }, { status: 400 });
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { aigentsStatus: 'completed', aigentsAnalysis: agentResponse },
    });

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
