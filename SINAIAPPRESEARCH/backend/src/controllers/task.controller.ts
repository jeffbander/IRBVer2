import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { updateTaskStatusSchema } from '../types/task';
import { listTasksForStudy, updateTaskStatus, getTaskById } from '../services/task.service';
import { recordAuditEvent } from '../services/audit.service';
import { HttpError } from '../middleware/errorHandler';

export const listTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  const studyIdRaw = req.query.studyId;
  if (typeof studyIdRaw !== 'string') {
    return res.status(400).json({ message: 'studyId query param is required' });
  }
  const tasks = await listTasksForStudy(studyIdRaw);
  res.json(tasks);
});

export const updateTaskStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params as { taskId: string };
  const parsed = updateTaskStatusSchema.parse({ taskId, ...req.body });
  const before = await getTaskById(taskId);
  if (!before) {
    throw new HttpError(404, 'Task not found');
  }
  const task = await updateTaskStatus(parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'task.updateStatus',
    entityType: 'Task',
    entityId: task.id,
    ...(actorId ? { actorId } : {}),
    before,
    after: task,
    request: req,
  });
  res.json(task);
});
