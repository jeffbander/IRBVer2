import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { createAssignmentSchema, updateAssignmentSchema } from '../types/assignment';
import {
  createAssignment,
  deleteAssignment,
  listAssignmentsForStudy,
  updateAssignment,
  getAssignmentById,
} from '../services/assignment.service';
import { recordAuditEvent } from '../services/audit.service';
import { HttpError } from '../middleware/errorHandler';

export const createAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createAssignmentSchema.parse(req.body);
  const assignment = await createAssignment(parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'assignment.create',
    entityType: 'Assignment',
    entityId: assignment.id,
    ...(actorId ? { actorId } : {}),
    before: null,
    after: assignment,
    request: req,
  });
  res.status(201).json(assignment);
});

export const listAssignmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const studyIdRaw = req.query.studyId;
  if (typeof studyIdRaw !== 'string') {
    return res.status(400).json({ message: 'studyId query param is required' });
  }
  const assignments = await listAssignmentsForStudy(studyIdRaw);
  res.json(assignments);
});

export const updateAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const before = await getAssignmentById(id);
  if (!before) {
    throw new HttpError(404, 'Assignment not found');
  }
  const parsed = updateAssignmentSchema.parse({ ...req.body, id });
  const assignment = await updateAssignment(id, parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'assignment.update',
    entityType: 'Assignment',
    entityId: id,
    ...(actorId ? { actorId } : {}),
    before,
    after: assignment,
    request: req,
  });
  res.json(assignment);
});

export const deleteAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const before = await getAssignmentById(id);
  if (!before) {
    throw new HttpError(404, 'Assignment not found');
  }
  await deleteAssignment(id);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'assignment.delete',
    entityType: 'Assignment',
    entityId: id,
    ...(actorId ? { actorId } : {}),
    before,
    after: null,
    request: req,
  });
  res.status(204).send();
});
