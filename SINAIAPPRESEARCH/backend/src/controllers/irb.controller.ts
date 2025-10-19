import { IRBPath } from '@prisma/client';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { createSubmissionSchema, irbStatusTransitionSchema } from '../types/irb';
import {
  createOrGetSubmission,
  getSubmissionForStudy,
  transitionStatus,
  updateSubmissionPath,
} from '../services/irb.service';
import { recordAuditEvent } from '../services/audit.service';

export const ensureSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSubmissionSchema.parse(req.body);
  const { submission, created } = await createOrGetSubmission(parsed);
  if (created) {
    const actorId = req.user?.id;
    await recordAuditEvent({
      action: 'irbSubmission.create',
      entityType: 'IRBSubmission',
      entityId: submission.id,
      ...(actorId ? { actorId } : {}),
      before: null,
      after: submission,
      request: req,
    });
  }
  res.status(created ? 201 : 200).json(submission);
});

export const transitionStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = irbStatusTransitionSchema.parse(req.body);
  const payload = {
    ...parsed,
    actorId: parsed.actorId ?? req.user?.id,
  };
  const { before, after } = await transitionStatus(payload);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'irbSubmission.transition',
    entityType: 'IRBSubmission',
    entityId: after.id,
    ...(actorId ? { actorId } : {}),
    before,
    after,
    request: req,
  });
  res.json(after);
});

export const getSubmissionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { studyId } = req.params as { studyId: string };
  const submission = await getSubmissionForStudy(studyId);
  res.json(submission);
});

export const updatePathHandler = asyncHandler(async (req: Request, res: Response) => {
  const { path } = req.body;
  if (!path) {
    return res.status(400).json({ message: 'path is required' });
  }
  const { studyId } = req.params as { studyId: string };
  if (!Object.values(IRBPath).includes(path as IRBPath)) {
    return res.status(400).json({ message: 'invalid path value' });
  }
  const before = await getSubmissionForStudy(studyId);
  const submission = await updateSubmissionPath(studyId, path as IRBPath);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'irbSubmission.updatePath',
    entityType: 'IRBSubmission',
    entityId: submission.id,
    ...(actorId ? { actorId } : {}),
    before,
    after: submission,
    request: req,
  });
  res.json(submission);
});
