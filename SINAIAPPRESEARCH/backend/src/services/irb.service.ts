import { IRBPath, IRBStatus } from '@prisma/client';
import { prisma } from '../repositories/prismaClient';
import { CreateSubmissionInput, IRBStatusTransitionInput } from '../types/irb';
import { HttpError } from '../middleware/errorHandler';

const transitions: Record<IRBStatus, IRBStatus[]> = {
  DRAFT: ['READY_TO_SUBMIT'],
  READY_TO_SUBMIT: ['SUBMITTED'],
  SUBMITTED: ['PRE_REVIEW'],
  PRE_REVIEW: ['MODIFICATIONS_REQUESTED', 'EXEMPT_DETERMINATION', 'EXPEDITED_APPROVED', 'MEETING_SCHEDULED', 'NOT_APPROVED'],
  MODIFICATIONS_REQUESTED: ['RESUBMITTED'],
  RESUBMITTED: ['PRE_REVIEW'],
  EXEMPT_DETERMINATION: [],
  EXPEDITED_APPROVED: [],
  MEETING_SCHEDULED: ['APPROVED', 'CONDITIONALLY_APPROVED', 'DEFERRED', 'NOT_APPROVED'],
  APPROVED: [],
  CONDITIONALLY_APPROVED: ['APPROVED'],
  DEFERRED: ['MEETING_SCHEDULED'],
  NOT_APPROVED: [],
};

const assertTransition = (from: IRBStatus, to: IRBStatus) => {
  if (!transitions[from]?.includes(to)) {
    throw new HttpError(400, `Cannot move IRB status from ${from} to ${to}`);
  }
};

export const createOrGetSubmission = async (input: CreateSubmissionInput) => {
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.findUnique({ where: { id: input.studyId } });
    if (!study) {
      throw new HttpError(404, 'Study not found');
    }

    const existing = await tx.iRBSubmission.findUnique({
      where: { studyId: input.studyId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });

    if (existing) {
      return { submission: existing, created: false };
    }

    const submission = await tx.iRBSubmission.create({
      data: {
        studyId: input.studyId,
        path: input.path ?? IRBPath.UNSET,
        submittedAt: input.submittedAt ? new Date(input.submittedAt) : null,
      },
    });

    await tx.iRBStatusHistory.create({
      data: {
        irbSubmissionId: submission.id,
        fromStatus: null,
        toStatus: 'DRAFT',
      },
    });

    const result = await tx.iRBSubmission.findUniqueOrThrow({
      where: { id: submission.id },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return { submission: result, created: true };
  });
};

export const updateSubmissionPath = async (studyId: string, path: IRBPath) => {
  const submission = await prisma.iRBSubmission.findUnique({ where: { studyId } });
  if (!submission) {
    throw new HttpError(404, 'IRB submission not found');
  }
  return prisma.iRBSubmission.update({
    where: { id: submission.id },
    data: { path },
    include: { statusHistory: { orderBy: { createdAt: 'asc' } }, study: true },
  });
};

export const transitionStatus = async (input: IRBStatusTransitionInput) => {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.iRBSubmission.findUnique({
      where: { studyId: input.studyId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } }, study: true },
    });
    if (!submission) {
      throw new HttpError(404, 'IRB submission not found');
    }

    const target = input.targetStatus as IRBStatus;
    assertTransition(submission.currentStatus, target);

    await tx.iRBSubmission.update({
      where: { id: submission.id },
      data: {
        currentStatus: target,
        expeditedCategory: input.expeditedCategory ?? submission.expeditedCategory,
        meetingDate: input.meetingDate ? new Date(input.meetingDate) : submission.meetingDate,
        determinedAt: input.determinedAt ? new Date(input.determinedAt) : submission.determinedAt,
        submittedAt: target === 'SUBMITTED' ? new Date() : submission.submittedAt,
        path:
          target === 'EXPEDITED_APPROVED'
            ? IRBPath.EXPEDITED
            : target === 'EXEMPT_DETERMINATION'
              ? IRBPath.EXEMPT
              : submission.path,
      },
    });

    await tx.iRBStatusHistory.create({
      data: {
        irbSubmissionId: submission.id,
        fromStatus: submission.currentStatus,
        toStatus: target,
        note: input.note ?? null,
        actorId: input.actorId ?? null,
      },
    });

    if (target === 'APPROVED' || target === 'EXPEDITED_APPROVED' || target === 'EXEMPT_DETERMINATION') {
      await tx.study.update({
        where: { id: input.studyId },
        data: { status: 'ACTIVE' },
      });
    }

    if (target === 'NOT_APPROVED') {
      await tx.study.update({
        where: { id: input.studyId },
        data: { status: 'CLOSED' },
      });
    }

    const after = await tx.iRBSubmission.findUniqueOrThrow({
      where: { id: submission.id },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } }, study: true },
    });

    return { before: submission, after };
  });
};

export const getSubmissionForStudy = async (studyId: string) => {
  const submission = await prisma.iRBSubmission.findUnique({
    where: { studyId },
    include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
  });
  if (!submission) {
    throw new HttpError(404, 'IRB submission not found');
  }
  return submission;
};
