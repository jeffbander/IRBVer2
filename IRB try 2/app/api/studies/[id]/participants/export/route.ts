import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let whereClause: any = {
      studyId: params.id,
    };

    if (status) {
      whereClause.status = status;
    }

    const participants = await prisma.participant.findMany({
      where: whereClause,
      orderBy: { enrolledAt: 'desc' },
    });

    const study = await prisma.study.findUnique({
      where: { id: params.id },
      select: { protocolNumber: true, title: true },
    });

    // Generate CSV content
    const csvHeader = 'Subject ID,Status,Group Assignment,Enrolled At,Consent Date,Withdrawal Date,Withdrawal Reason,Notes\n';

    const csvRows = participants.map(participant => {
      const enrolledAt = new Date(participant.enrolledAt).toLocaleDateString();
      const consentDate = participant.consentDate ? new Date(participant.consentDate).toLocaleDateString() : '';
      const withdrawalDate = participant.withdrawalDate ? new Date(participant.withdrawalDate).toLocaleDateString() : '';
      const notes = (participant.notes || '').replace(/"/g, '""'); // Escape quotes in notes

      return `"${participant.subjectId}","${participant.status}","${participant.groupAssignment || ''}","${enrolledAt}","${consentDate}","${withdrawalDate}","${participant.withdrawalReason || ''}","${notes}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    const filename = `participants-${study?.protocolNumber || params.id}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export participants' }, { status: 500 });
  }
}
