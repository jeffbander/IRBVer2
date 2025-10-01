import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Submit study for review
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
    const { action, reviewerId, comments } = await request.json();

    const study = await prisma.study.findUnique({
      where: { id: params.id }
    });

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    // Handle different review actions
    switch (action) {
      case 'submit':
        // Only PI can submit for review
        if (study.principalInvestigatorId !== user.userId) {
          return NextResponse.json({ error: 'Only the PI can submit for review' }, { status: 403 });
        }

        if (study.status !== 'DRAFT') {
          return NextResponse.json({ error: 'Only draft studies can be submitted' }, { status: 400 });
        }

        await prisma.study.update({
          where: { id: params.id },
          data: {
            status: 'PENDING_REVIEW',
            reviewerId: reviewerId || null
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: 'SUBMIT_FOR_REVIEW',
            entity: 'Study',
            entityId: params.id,
            details: { comments }
          }
        });

        return NextResponse.json({ message: 'Study submitted for review' });

      case 'approve':
        // Only reviewers can approve
        const permissions = user.role.permissions as string[];
        if (!permissions.includes('approve_studies')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        if (study.status !== 'PENDING_REVIEW') {
          return NextResponse.json({ error: 'Only pending studies can be approved' }, { status: 400 });
        }

        await prisma.study.update({
          where: { id: params.id },
          data: {
            status: 'APPROVED',
            irbApprovalDate: new Date(),
            irbExpirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            reviewerId: user.userId
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: 'APPROVE_STUDY',
            entity: 'Study',
            entityId: params.id,
            details: { comments }
          }
        });

        // Create notification (placeholder for email)
        console.log(`Notification: Study ${study.title} has been approved`);

        return NextResponse.json({ message: 'Study approved' });

      case 'reject':
        // Only reviewers can reject
        if (!user.role.permissions.includes('approve_studies')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        if (study.status !== 'PENDING_REVIEW') {
          return NextResponse.json({ error: 'Only pending studies can be rejected' }, { status: 400 });
        }

        await prisma.study.update({
          where: { id: params.id },
          data: {
            status: 'DRAFT',
            reviewerId: user.userId
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: 'REJECT_STUDY',
            entity: 'Study',
            entityId: params.id,
            details: { comments, reason: 'rejected' }
          }
        });

        // Create notification
        console.log(`Notification: Study ${study.title} has been rejected. Reason: ${comments}`);

        return NextResponse.json({ message: 'Study rejected', comments });

      case 'request_changes':
        // Only reviewers can request changes
        if (!user.role.permissions.includes('review_studies')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        await prisma.study.update({
          where: { id: params.id },
          data: {
            status: 'DRAFT',
            reviewerId: user.userId
          }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: 'REQUEST_CHANGES',
            entity: 'Study',
            entityId: params.id,
            details: { comments, requestedChanges: comments }
          }
        });

        // Create notification
        console.log(`Notification: Changes requested for study ${study.title}`);

        return NextResponse.json({ message: 'Changes requested', comments });

      case 'activate':
        // Activate an approved study
        if (study.status !== 'APPROVED') {
          return NextResponse.json({ error: 'Only approved studies can be activated' }, { status: 400 });
        }

        if (study.principalInvestigatorId !== user.userId && !user.role.permissions.includes('edit_all_studies')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        await prisma.study.update({
          where: { id: params.id },
          data: { status: 'ACTIVE' }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: 'ACTIVATE_STUDY',
            entity: 'Study',
            entityId: params.id,
            details: null
          }
        });

        return NextResponse.json({ message: 'Study activated' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing review action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET review history
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

    const reviewHistory = await prisma.auditLog.findMany({
      where: {
        entityId: params.id,
        entity: 'Study',
        action: {
          in: ['SUBMIT_FOR_REVIEW', 'APPROVE_STUDY', 'REJECT_STUDY', 'REQUEST_CHANGES', 'ACTIVATE_STUDY']
        }
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(reviewHistory);
  } catch (error) {
    console.error('Error fetching review history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}