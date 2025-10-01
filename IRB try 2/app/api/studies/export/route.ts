import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    let whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const studies = await prisma.study.findMany({
      where: whereClause,
      include: {
        principalInvestigator: true,
        _count: {
          select: {
            participants: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV content
    const csvHeader = 'Protocol Number,Title,Type,Status,PI Name,Target Enrollment,Participants,Documents,Start Date,End Date,Risk Level,Created At\n';

    const csvRows = studies.map(study => {
      const piName = `${study.principalInvestigator.firstName} ${study.principalInvestigator.lastName}`;
      const startDate = study.startDate ? new Date(study.startDate).toLocaleDateString() : '';
      const endDate = study.endDate ? new Date(study.endDate).toLocaleDateString() : '';
      const createdAt = new Date(study.createdAt).toLocaleDateString();

      return `"${study.protocolNumber}","${study.title}","${study.type}","${study.status}","${piName}","${study.targetEnrollment || ''}","${study._count.participants}","${study._count.documents}","${startDate}","${endDate}","${study.riskLevel}","${createdAt}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="studies-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export studies' }, { status: 500 });
  }
}
