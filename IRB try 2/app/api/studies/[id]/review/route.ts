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
        let permissions = user.role.permissions;
        // Ensure permissions is an array (could be string from JWT)
        if (typeof permissions === 'string') {
          try {
            permissions = JSON.parse(permissions);
          } catch {
            permissions = [];
          }
        }

        if (!Array.isArray(permissions) || !hasPermission(permissions, 'approve_studies')) {
          console.log('Permission check failed:', { permissions, hasApprove: permissions?.includes?.('approve_studies') });
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
        let rejectPermissions = user.role.permissions;
        if (typeof rejectPermissions === 'string') {
          try {
            rejectPermissions = JSON.parse(rejectPermissions);
          } catch {
            rejectPermissions = [];
          }
        }

        if (!Array.isArray(rejectPermissions) || !hasPermission(rejectPermissions, 'approve_studies')) {
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
        let requestChangesPermissions = user.role.permissions;
        if (typeof requestChangesPermissions === 'string') {
          try {
            requestChangesPermissions = JSON.parse(requestChangesPermissions);
          } catch {
            requestChangesPermissions = [];
          }
        }

        if (!Array.isArray(requestChangesPermissions) || !hasPermission(requestChangesPermissions, 'review_studies')) {
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
        // Activate an approved study - allowed for reviewers and admins
        if (study.status !== 'APPROVED') {
          return NextResponse.json({ error: 'Only approved studies can be activated' }, { status: 400 });
        }

        // Allow reviewers (with approve_studies permission) and admins to activate
        let activatePermissions = user.role.permissions;
        if (typeof activatePermissions === 'string') {
          try {
            activatePermissions = JSON.parse(activatePermissions);
          } catch {
            activatePermissions = [];
          }
        }

        const canActivate = Array.isArray(activatePermissions) &&
          (activatePermissions.includes('approve_studies') || activatePermissions.includes('edit_all_studies'));

        if (!canActivate) {
          return NextResponse.json({ error: 'Insufficient permissions - only reviewers and admins can activate studies' }, { status: 403 });
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
            details: {}
          }
        });

        return NextResponse.json({ message: 'Study activated' });

      case 'inactivate':
        // Inactivate a study and return it to review status - allowed for reviewers and admins
        if (!['ACTIVE', 'APPROVED'].includes(study.status)) {
          return NextResponse.json({ error: 'Only active or approved studies can be inactivated' }, { status: 400 });
        }

        // Allow reviewers (with approve_studies permission) and admins to inactivate
        let inactivatePermissions = user.role.permissions;
        if (typeof inactivatePermissions === 'string') {
          try {
            inactivatePermissions = JSON.parse(inactivatePermissions);
          } catch {
            inactivatePermissions = [];
          }
        }

        const canInactivate = Array.isArray(inactivatePermissions) &&
          (inactivatePermissions.includes('approve_studies') || inactivatePermissions.includes('edit_all_studies'));

        if (!canInactivate) {
          return NextResponse.json({ error: 'Insufficient permissions - only reviewers and admins can inactivate studies' }, { status: 403 });
        }

        await prisma.study.update({
          where: { id: params.id },
          data: { status: 'PENDING_REVIEW' }
        });

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: 'INACTIVATE_STUDY',
            entity: 'Study',
            entityId: params.id,
            details: { comments, reason: 'Returned to review' }
          }
        });

        console.log(`Notification: Study ${study.title} has been returned to review`);

        return NextResponse.json({ message: 'Study returned to review status' });

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
          in: ['SUBMIT_FOR_REVIEW', 'APPROVE_STUDY', 'REJECT_STUDY', 'REQUEST_CHANGES', 'ACTIVATE_STUDY', 'INACTIVATE_STUDY']
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