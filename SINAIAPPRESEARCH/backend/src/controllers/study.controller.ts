import { Request, Response } from 'express';
import { createStudySchema, updateStudySchema } from '../types/study';
import { asyncHandler } from '../middleware/asyncHandler';
import { createStudy, getStudyById, listStudies, softDeleteStudy, updateStudy } from '../services/study.service';
import { recordAuditEvent } from '../services/audit.service';

export const createStudyHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createStudySchema.parse(req.body);
  const study = await createStudy(parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'study.create',
    entityType: 'Study',
    entityId: study.id,
    ...(actorId ? { actorId } : {}),
    before: null,
    after: study,
    request: req,
  });
  res.status(201).json(study);
});

export const listStudiesHandler = asyncHandler(async (req: Request, res: Response) => {
  const filters: { piId?: string; status?: string; search?: string } = {};
  const { piId, status, search } = req.query;
  if (typeof piId === 'string') {
    filters.piId = piId;
  }
  if (typeof status === 'string') {
    filters.status = status;
  }
  if (typeof search === 'string') {
    filters.search = search;
  }

  const studies = await listStudies(filters);
  res.json(studies);
});

export const getStudyHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const study = await getStudyById(id);
  res.json(study);
});

export const updateStudyHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateStudySchema.parse(req.body);
  const { id } = req.params as { id: string };
  const before = await getStudyById(id);
  const study = await updateStudy(id, parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'study.update',
    entityType: 'Study',
    entityId: id,
    ...(actorId ? { actorId } : {}),
    before,
    after: study,
    request: req,
  });
  res.json(study);
});

export const deleteStudyHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const before = await getStudyById(id);
  await softDeleteStudy(id);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'study.delete',
    entityType: 'Study',
    entityId: id,
    ...(actorId ? { actorId } : {}),
    before,
    after: null,
    request: req,
  });
  res.status(204).send();
});
